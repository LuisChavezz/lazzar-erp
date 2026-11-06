"use client";

import { useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ExportCsvIcon, ExportPdfIcon } from "@/src/components/Icons";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { hasPermission } from "@/src/utils/permissions";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { usePurchaseOrdersTable } from "../hooks/usePurchaseOrdersTable";
import { usePurchaseOrderCsvExport } from "../hooks/usePurchaseOrderCsvExport";
import { usePurchaseOrderPdfExport } from "../hooks/usePurchaseOrderPdfExport";
import { getColumns } from "./PurchaseOrderColumns";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderOnboardingStepManager } from "./PurchaseOrderOnboardingStepManager";
import { PurchaseOrderEditDialog } from "./PurchaseOrderEditDialog";
import { PurchaseOrderCancelDialog } from "./PurchaseOrderCancelDialog";
import { PurchaseOrderCriticalPathDialog } from "./PurchaseOrderCriticalPathDialog";
import { PurchaseOrderSendEmailConfirmDialog } from "./PurchaseOrderSendEmailConfirmDialog";
import { usePurchaseOrderEmailConfirmation } from "../hooks/useSendPurchaseOrderEmail";
import { PurchaseOrderRowActionsProvider } from "../hooks/purchaseOrderRowActionsContext";
import type { PurchaseOrderCriticalPathTarget } from "../interfaces/purchase-order-critical-path.interface";

// ─── Vista principal ─────────────────────────────────────────────────────────

interface PurchaseOrderViewProps {
  /**
   * Llaves EXTRA que "Actualizar datos" de la tabla invalida junto con la
   * lista (los indicadores que la página monta encima), para que tarjetas y
   * tabla no muestren cifras de momentos distintos. Mismo mecanismo que
   * `OrderListView`: llaves y no un callback porque la página es de servidor.
   * El "Reintentar" del error de la tabla sigue tocando solo la lista.
   */
  extraRefetchQueryKeys?: readonly QueryKey[];
}

/**
 * Listado de órdenes de compra en MODO SERVIDOR: filtros, búsqueda, orden y
 * paginación los resuelve el backend y su estado vive en la URL
 * (`usePurchaseOrdersTable`). Por eso la página que lo monta lo envuelve en
 * `<Suspense>`. El dashboard de Compras lee `kpis/` y el selector de OC de
 * facturas de proveedor busca en el servidor (`usePurchaseOrderSearchField`).
 */
export function PurchaseOrderView({ extraRefetchQueryKeys }: PurchaseOrderViewProps = {}) {
  const purchaseOrdersTable = usePurchaseOrdersTable();
  const queryClient = useQueryClient();
  const { onRefetch } = purchaseOrdersTable.tableProps;
  const handleToolbarRefetch =
    onRefetch && extraRefetchQueryKeys?.length
      ? () =>
          Promise.all([
            onRefetch(),
            ...extraRefetchQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
          ])
      : onRefetch;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Llegar a esta pantalla exige `R-COMPRAS-OC` (ver `routePermissions`); dar
  // de alta exige además `C-COMPRAS-OC`. `hasPermission` cortocircuita para
  // el rol "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-COMPRAS-OC", session?.user);

  // ── Edición ───────────────────────────────────────────────────────────────
  // El diálogo de edición se monta AQUÍ y no dentro de la celda de acciones:
  // una celda se desmonta al ordenar, paginar o filtrar la tabla, y con ella
  // se perdería el wizard a medio llenar. La celda solo dispara `onEdit`.
  // `null` = cerrado; el objeto de la fila alimenta `initialData`.
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  // ── Cancelación ───────────────────────────────────────────────────────────
  // Mismo motivo que la edición, y uno más: cancelar CAMBIA el estatus, así
  // que el refetch puede sacar la fila de una vista filtrada por estatus con
  // el diálogo todavía abierto. `open` va aparte de la orden para que el texto
  // del diálogo no se vacíe durante su animación de cierre.
  const [cancellingOrder, setCancellingOrder] = useState<PurchaseOrder | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  // ── Ruta crítica ──────────────────────────────────────────────────────────
  // Mismo motivo: vive aquí y no en la celda. Guarda la FOTO de la fila
  // (folio y estatus) al abrir: un refetch del listado con el diálogo abierto
  // no le cambia el modo de solo lectura a media captura.
  const [criticalPathTarget, setCriticalPathTarget] =
    useState<PurchaseOrderCriticalPathTarget | null>(null);

  // ── Correo al proveedor ───────────────────────────────────────────────────
  // Mismo motivo: la confirmación vive aquí y no en la celda. "Enviar correo"
  // PREPARA el correo (orden fresca + render) y lo muestra para confirmarse;
  // nada se envía hasta confirmar. Mismo flujo que facturas y cotizaciones.
  // `request` llega al menú de cada fila por contexto (ver el Provider abajo).
  const email = usePurchaseOrderEmailConfirmation();
  const rowActions = { onSendEmail: email.request };

  // Callbacks inline (solo setters, estables): la factoría no se recalcula.
  const columns = getColumns(
    setEditingOrder,
    (order) => {
      setCancellingOrder(order);
      setIsCancelOpen(true);
    },
    (order) =>
      setCriticalPathTarget({ ocId: order.id, folio: order.folio, estatus: order.estatus }),
  );

  // ── Exportar (Excel/PDF) ──────────────────────────────────────────────────
  // Exportan TODO lo que cumple los criterios vigentes (búsqueda, filtros y
  // orden), no solo la página visible: las filas se piden al backend al hacer
  // clic (`fetchAllRows`). Las columnas son las visibles, por
  // `onVisibleColumnsChange`.
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<PurchaseOrder>[]>(
    [],
  );
  usePurchaseOrderCsvExport(purchaseOrdersTable.fetchAllRows, visibleColumns);
  usePurchaseOrderPdfExport(purchaseOrdersTable.fetchAllRows, visibleColumns);

  // ── Orden ────────────────────────────────────────────────────────────────
  // Por defecto el del backend: `-fecha_oc, -id` (`purchaseOrdersTable`).
  // `fecha_oc` es la fecha DE NEGOCIO de la orden (un `DateField`, sin hora);
  // `-id` desempata las del mismo día de forma estable entre páginas.

  // ── Tabla de órdenes ──────────────────────────────────────────────────────
  // `DataTable` se monta SIEMPRE (recibe `isLoading`/`isError` y alterna solo
  // su cuerpo), así que su toolbar y `actionButton` ("Nueva Orden") siguen
  // disponibles durante la carga o un error. Mismo patrón que
  // `AccountsReceivableList`.
  //
  // Filas compactas, buscador siempre a mano y un solo marco que une toolbar
  // + tabla vienen del default de `DataTable` (diseño aprobado): no se pasan.
  const table = (
    <DataTable
      columns={columns}
      {...purchaseOrdersTable.tableProps}
      onRefetch={handleToolbarRefetch}
      // Identidad de la fila por registro, no por posición en la página.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar por folio, referencia o proveedor..."
      onVisibleColumnsChange={setVisibleColumns}
      actionButton={
        <div className="flex items-center gap-2 shrink-0">
          {/* Exportar: a la IZQUIERDA de "+ Nueva Orden" — son consulta, no
              el CTA principal de la pantalla, así que no deben competir con
              su prominencia visual. */}
          <Button
            variant="success"
            size="icon"
            onClick={() => document.dispatchEvent(new CustomEvent("purchase-orders:exportCSV"))}
            title="Exportar a Excel (CSV)"
            aria-label="Exportar órdenes de compra a Excel"
          >
            <ExportCsvIcon className="w-4 h-4 shrink-0" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={() => document.dispatchEvent(new CustomEvent("purchase-orders:exportPDF"))}
            title="Exportar a PDF"
            aria-label="Exportar órdenes de compra a PDF"
          >
            <ExportPdfIcon className="w-4 h-4 shrink-0" />
          </Button>
          {canCreate && (
            <MainDialog
              title={
                <DialogHeader
                  title="Nueva Orden de Compra"
                  subtitle="Registro Nuevo"
                  statusColor="sky"
                />
              }
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              maxWidth="720px"
              showCloseButton={false}
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={() => setIsDialogOpen(true)}
                >
                  + Nueva Orden
                </Button>
              }
            >
              <PurchaseOrderOnboardingStepManager
                onClose={() => setIsDialogOpen(false)}
              />
            </MainDialog>
          )}
        </div>
      }
      emptyMessage="Aún no hay órdenes de compra registradas"
      errorTitle="Error al cargar órdenes de compra"
      loadingAriaLabel="Cargando órdenes de compra"
    />
  );

  // Un único `return`: la tabla se monta SIEMPRE (maneja carga/error en su
  // cuerpo, conservando su toolbar). Los indicadores ya no viven aquí: los
  // monta la página encima de esta vista (`PurchaseOrderKpisSection`), con
  // consulta propia al backend.
  return (
    <PurchaseOrderRowActionsProvider value={rowActions}>
    <div className="space-y-6">
      {/* ── Tabla de órdenes ──────────────────────────────────────────────── */}
      {table}

      {/* ── Edición ───────────────────────────────────────────────────────── */}
      {/* Montado a nivel vista (ver `editingOrder`). `initialData` conserva la
          orden mientras el diálogo se cierra para que el contenido no
          desaparezca a mitad de la animación. */}
      <PurchaseOrderEditDialog
        open={editingOrder !== null}
        onOpenChange={(open) => {
          if (!open) setEditingOrder(null);
        }}
        initialData={editingOrder ?? undefined}
      />

      {/* ── Cancelación ───────────────────────────────────────────────────── */}
      <PurchaseOrderCancelDialog
        order={cancellingOrder}
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
      />

      {/* ── Ruta crítica ──────────────────────────────────────────────────── */}
      {/* Controlado: conserva la OC (`useDialogSession`) mientras se anima su
          cierre, y cada apertura espera su lectura fresca. */}
      <PurchaseOrderCriticalPathDialog
        target={criticalPathTarget}
        open={criticalPathTarget !== null}
        onOpenChange={(open) => {
          if (!open) setCriticalPathTarget(null);
        }}
      />

      {/* ── Correo al proveedor ───────────────────────────────────────────── */}
      {/* El correo mostrado es la foto preparada al pedir el envío
          (`useDialogSession`: sobrevive a la animación de cierre), y es
          exactamente lo que se envía al confirmar. */}
      {email.dialog && (
        <PurchaseOrderSendEmailConfirmDialog key={email.dialog.sessionId} {...email.dialog.props} />
      )}
    </div>
    </PurchaseOrderRowActionsProvider>
  );
}
