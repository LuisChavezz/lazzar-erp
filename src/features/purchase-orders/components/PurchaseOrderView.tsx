"use client";

import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ComprasIcon,
  ClockIcon,
  CheckCircleIcon,
  ErrorIcon,
  ExportCsvIcon,
  ExportPdfIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { DataTable, type DataTableVisibleColumn } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import { usePurchaseOrderCsvExport } from "../hooks/usePurchaseOrderCsvExport";
import { usePurchaseOrderPdfExport } from "../hooks/usePurchaseOrderPdfExport";
import { getColumns } from "./PurchaseOrderColumns";
import { buildStatusOptions, buildSupplierOptions } from "./PurchaseOrdersFilter";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderOnboardingStepManager } from "./PurchaseOrderOnboardingStepManager";
import { PurchaseOrderEditDialog } from "./PurchaseOrderEditDialog";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderCancelled,
  isPurchaseOrderPending,
} from "../constants/purchaseOrderStatus";

// ─── KPIs ────────────────────────────────────────────────────────────────────

const OrderStats = memo(function OrderStats({ items }: { items: PurchaseOrder[] }) {
  const total = items.length;

  const pendientes = useMemo(
    () => items.filter((o) => isPurchaseOrderPending(o.estatus)).length,
    [items],
  );

  const autorizadas = useMemo(
    () => items.filter((o) => isPurchaseOrderAuthorizedOrComplete(o.estatus)).length,
    [items],
  );

  const canceladas = useMemo(
    () => items.filter((o) => isPurchaseOrderCancelled(o.estatus)).length,
    [items],
  );

  const kpis = useMemo<KpiItem[]>(
    () => [
      {
        label: "Total Órdenes",
        value: String(total),
        icon: ComprasIcon,
        iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
        iconClass: "text-sky-500",
        trendLabel: "Activas",
        status: "neutral",
      },
      {
        label: "Pendientes",
        value: String(pendientes),
        icon: ClockIcon,
        iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
        iconClass: "text-amber-500",
        trendLabel: "Por autorizar",
        status: "neutral",
      },
      {
        label: "Autorizadas",
        value: String(autorizadas),
        icon: CheckCircleIcon,
        iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
        iconClass: "text-emerald-500",
        trendLabel: "Completadas o en curso",
        status: "positive",
      },
      {
        label: "Canceladas",
        value: String(canceladas),
        icon: ErrorIcon,
        iconBgClass: "bg-red-50 dark:bg-red-500/10",
        iconClass: "text-red-500",
        trendLabel: "Este período",
        status: "negative",
      },
    ],
    [total, pendientes, autorizadas, canceladas],
  );

  return <KpiGrid items={kpis} />;
});

// ─── Vista principal ─────────────────────────────────────────────────────────

export function PurchaseOrderView() {
  const {
    purchaseOrders = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePurchaseOrders();

  const router = useRouter();
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

  // ── Opciones de los filtros de encabezado ─────────────────────────────────
  // Alimentan los desplegables de O.C. (Estatus) y Proveedor dentro de
  // `getColumns` (ver `ColumnFilterHeader`); se recalculan solo cuando cambia
  // el listado, no en cada render.
  const statusOptions = useMemo(() => buildStatusOptions(purchaseOrders), [purchaseOrders]);
  const supplierOptions = useMemo(() => buildSupplierOptions(purchaseOrders), [purchaseOrders]);

  const columns = useMemo(
    () =>
      getColumns(
        (id) => router.push(`/procurement/purchase-orders/${id}`),
        setEditingOrder,
        statusOptions,
        supplierOptions,
      ),
    [router, statusOptions, supplierOptions],
  );

  // ── Exportar (Excel/PDF) ──────────────────────────────────────────────────
  // Exportan lo que el usuario está VIENDO (`onVisibleRowsChange`/
  // `onVisibleColumnsChange` de `DataTable`: ya filtrado/ordenado, con la
  // visibilidad de columnas que haya elegido), no el listado completo sin
  // tocar. Mismo patrón que `QuoteList` (`useQuoteCsvExport`/`useQuotePdfExport`).
  const [visibleOrders, setVisibleOrders] = useState<PurchaseOrder[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<PurchaseOrder>[]>(
    [],
  );
  usePurchaseOrderCsvExport(visibleOrders, visibleColumns);
  usePurchaseOrderPdfExport(visibleOrders, visibleColumns);

  // ── Orden ────────────────────────────────────────────────────────────────
  // Lo resuelve el backend: `-fecha_oc, -id`. `fecha_oc` es la fecha DE NEGOCIO
  // de la orden (un `DateField`, sin hora), que es la que el listado debe
  // respetar; `-id` desempata las del mismo día de forma estable y determinista
  // al ser la PK. Aquí ya no se reordena: el `sort` que vivía en este punto lo
  // hacía por `created_at` (el timestamp de inserción, un campo DISTINTO), así
  // que además de redundante contradecía el orden del backend — una OC
  // capturada hoy con fecha retroactiva salía hasta arriba.

  // ── Tabla de órdenes ──────────────────────────────────────────────────────
  // `DataTable` se monta SIEMPRE (recibe `isLoading`/`isError` y alterna solo
  // su cuerpo), así que su toolbar y `actionButton` ("Nueva Orden") siguen
  // disponibles durante la carga o un error. Mismo patrón que
  // `AccountsReceivableList`.
  //
  // `density="compact"` + `framed` + `searchAlwaysExpanded` a propósito: esta
  // lista prioriza ver muchas órdenes de un vistazo (filas delgadas), un
  // buscador siempre a mano (sin el paso extra de expandirlo) y un solo marco
  // visual que una toolbar + tabla en vez de dos bloques flotantes separados.
  const table = (
    <DataTable
      columns={columns}
      data={purchaseOrders}
      searchPlaceholder="Buscar orden, folio o referencia..."
      searchAlwaysExpanded
      density="compact"
      framed
      defaultPageSize={20}
      onVisibleRowsChange={setVisibleOrders}
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
              maxWidth="640px"
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
      onRefetch={refetch}
      isRefetching={isFetching}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar órdenes de compra"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando órdenes de compra"
    />
  );

  // Un único `return`: la tabla se monta SIEMPRE (maneja carga/error en su
  // cuerpo, conservando su toolbar); los KPIs se ocultan durante la carga
  // INICIAL (`isLoading`) y ante un error de carga (`isError`) —no hay datos
  // que resumir—. `purchaseOrders` arranca en `[]`, así que sin este gate los
  // KPIs mostrarían ceros ("Total Órdenes: 0", etc.). En un refetch en segundo
  // plano (`isFetching`, con datos en caché) `isLoading`/`isError` son false y
  // los KPIs siguen visibles con los datos previos.
  return (
    <div className="space-y-6">
      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {!isLoading && !isError && <OrderStats items={purchaseOrders} />}

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
    </div>
  );
}
