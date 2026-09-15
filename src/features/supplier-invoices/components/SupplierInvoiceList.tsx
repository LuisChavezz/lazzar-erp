"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { FACTURA_PROVEEDOR_ESTATUS_FILTER } from "../constants/supplierInvoiceStatus";
import {
  motivoBloqueoRegistro,
  toastIdBloqueoRegistro,
} from "../schemas/supplier-invoice.schema";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { useSupplierInvoices } from "../hooks/useSupplierInvoices";
import { useUpdateSupplierInvoice } from "../hooks/useUpdateSupplierInvoice";
import { getColumns } from "./SupplierInvoiceColumns";
import { SupplierInvoiceDetailDialog } from "./SupplierInvoiceDetailDialog";
import SupplierInvoiceForm from "./SupplierInvoiceForm";
import SupplierInvoiceEditForm from "./SupplierInvoiceEditForm";

export default function SupplierInvoiceList() {
  const { facturas, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useSupplierInvoices();
  // `mutateAsync`, no `mutate`: el candado se libera sobre la PROMESA de cada
  // llamada. Los callbacks de `mutate` solo corren para la última llamada del
  // observer, y con dos filas en vuelo el `finally` de la primera se perdería.
  // Sin `onServerError`: una acción de fila no tiene formulario donde repartir el
  // error y se queda con el toast del hook (que ya usa el parser de ambas formas).
  const { mutateAsync: updateAsync } = useUpdateSupplierInvoice();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de TODOS los diálogos en la vista, nunca en la celda: una celda se
  // desmonta al ordenar, filtrar o paginar, y registrar/cancelar cambian el
  // `estatus`, que es justo el filtro de la tabla.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [registrarTargetId, setRegistrarTargetId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  /**
   * La edición guarda una FOTO de la factura al abrir, no solo el id: el
   * formulario inicializa sus valores con ella, y si leyera la fila viva un
   * refetch mientras el usuario escribe cambiaría sus `defaultValues` a media
   * captura.
   */
  const [editTarget, setEditTarget] = useState<FacturaProveedor | null>(null);

  // Un candado por acción, con las filas en vuelo de cada una. Registrar genera
  // una CxP: un doble clic no debe disparar dos PATCH.
  const registrarLock = useRowActionLock();
  const cancelLock = useRowActionLock();

  const showError = isInitialLoadError(isError, hasLoaded);

  const handleViewDetail = useCallback((id: number) => setOpenDetailId(id), []);

  const handleEdit = useCallback(
    (id: number) => {
      const factura = facturas.find((item) => item.id === id);
      // Solo borradores: una factura registrada o cancelada se consulta, no se edita.
      if (factura?.estatus === "Borrador") setEditTarget(factura);
    },
    [facturas],
  );

  /**
   * Registrar desde el listado — el camino que no pasa por un formulario.
   *
   * La regla de "requerido para registrar" se evalúa con `motivoBloqueoRegistro`,
   * que ejecuta el MISMO esquema que la edición y el alta. Si falta algo se corta
   * ANTES de abrir la confirmación y el PATCH nunca sale: la acción de fila no
   * tiene dónde capturar la fecha, así que se dice dónde hacerlo.
   */
  const handleRegistrar = useCallback(
    (id: number) => {
      const factura = facturas.find((item) => item.id === id);
      if (!factura || factura.estatus !== "Borrador") return;
      const bloqueo = motivoBloqueoRegistro(factura);
      if (bloqueo) {
        // Un solo aviso con el motivo más grave (ver `motivoBloqueoRegistro`). El
        // `id` fijo por factura evita que clics repetidos apilen toasts iguales.
        toast.error(bloqueo.mensaje, { id: toastIdBloqueoRegistro(id), duration: 9000 });
        return;
      }
      // Registrable: retira cualquier aviso de bloqueo previo de esta factura.
      toast.dismiss(toastIdBloqueoRegistro(id));
      setRegistrarTargetId(id);
    },
    [facturas],
  );

  const handleCancel = useCallback(
    (id: number) => {
      const factura = facturas.find((item) => item.id === id);
      // Solo borradores (ver `SupplierInvoiceColumns`).
      if (factura?.estatus === "Borrador") setCancelTargetId(id);
    },
    [facturas],
  );

  const columns = useMemo(
    () => getColumns(handleViewDetail, handleEdit, handleRegistrar, handleCancel),
    [handleViewDetail, handleEdit, handleRegistrar, handleCancel],
  );

  // El detalle se busca contra el arreglo COMPLETO (`facturas` llega sin filtrar;
  // el filtrado ocurre dentro de `DataTable`), así que sobrevive a que la fila
  // salga de la vista filtrada —p. ej. registrar con el filtro "Borrador"
  // activo— y además muestra el estatus nuevo tras el refetch. Sin fetch propio:
  // list y retrieve comparten serializer.
  const detailFactura =
    openDetailId !== null ? facturas.find((f) => f.id === openDetailId) ?? null : null;

  // Si la factura desaparece del payload completo, el id no puede quedar colgado
  // (un refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`). Mismo patrón que `PolizaList`.
  if (openDetailId !== null && detailFactura === null) setOpenDetailId(null);

  const existe = (id: number) => facturas.some((f) => f.id === id);
  if (registrarTargetId !== null && !existe(registrarTargetId)) setRegistrarTargetId(null);
  if (cancelTargetId !== null && !existe(cancelTargetId)) setCancelTargetId(null);

  const etiqueta = (id: number | null) => {
    if (id === null) return "";
    const factura = facturas.find((f) => f.id === id);
    return factura?.folio || `#${id}`;
  };

  /** Ejecuta una acción de fila bajo su candado y cierra SU diálogo al terminar. */
  const runRowAction = (
    lock: ReturnType<typeof useRowActionLock>,
    id: number,
    estatus: "Registrada" | "Cancelada",
    close: (updater: (current: number | null) => number | null) => void,
  ) => {
    if (!lock.acquire(id)) return;
    updateAsync({ id, payload: { estatus } })
      // El hook ya avisó del error con su toast; aquí solo se evita el rechazo
      // no manejado de la promesa.
      .catch(() => {})
      .finally(() => {
        lock.release(id);
        // Solo se cierra el diálogo de ESTA factura, por si mientras tanto se
        // abrió el de otra.
        close((current) => (current === id ? null : current));
      });
  };

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={facturas}
        baseDataCount={facturas.length}
        title="Facturas de Proveedor"
        searchPlaceholder="Buscar por folio o proveedor..."
        filterConfig={[
          { id: "estatus", label: "Estatus", options: FACTURA_PROVEEDOR_ESTATUS_FILTER },
        ]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage="No hay facturas de proveedor registradas."
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las facturas de proveedor"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando facturas de proveedor"
        getRowId={(row) => String(row.id)}
        paginationResetKey={facturas.length}
        actionButton={
          <MainDialog
            title={
              <DialogHeader
                title="Nueva Factura de Proveedor"
                subtitle="Factura de mercancía recibida contra una orden de compra"
                statusColor="indigo"
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="1100px"
            trigger={
              <Button variant="primary" rounded="full" className="hover:scale-105 active:scale-95">
                + Nueva factura
              </Button>
            }
          >
            {isFormOpen && <SupplierInvoiceForm onSuccess={() => setIsFormOpen(false)} />}
          </MainDialog>
        }
      />

      {detailFactura && (
        <SupplierInvoiceDetailDialog
          factura={detailFactura}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenDetailId(null);
          }}
        />
      )}

      {editTarget && (
        <MainDialog
          title={
            <DialogHeader
              title="Editar Factura de Proveedor"
              subtitle={`Borrador ${editTarget.folio || `#${editTarget.id}`}: las partidas y los importes ya no se pueden cambiar`}
              statusColor="indigo"
            />
          }
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          maxWidth="760px"
        >
          <SupplierInvoiceEditForm factura={editTarget} onSuccess={() => setEditTarget(null)} />
        </MainDialog>
      )}

      {registrarTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setRegistrarTargetId(null);
          }}
          title="Registrar Factura de Proveedor"
          description={`¿Deseas registrar la factura ${etiqueta(registrarTargetId)}? Se generará su cuenta por pagar (CxP) con el total de la factura y sus importes quedarán congelados: después ya no podrá cambiar el total, el proveedor ni la moneda, ni volver a borrador o cancelarse.`}
          confirmText={
            registrarLock.isPending(registrarTargetId) ? "Registrando..." : "Registrar y generar CxP"
          }
          cancelText="Volver"
          // `closeOnConfirm={false}`: si no, el diálogo se cierra al instante y la
          // etiqueta de pendiente nunca se pinta. Lo cierra `runRowAction` al terminar.
          closeOnConfirm={false}
          onConfirm={() =>
            runRowAction(registrarLock, registrarTargetId, "Registrada", setRegistrarTargetId)
          }
          confirmColor="amber"
        />
      )}

      {cancelTargetId !== null && (
        <ConfirmDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setCancelTargetId(null);
          }}
          title="Cancelar Factura de Proveedor"
          description={`¿Deseas cancelar el borrador ${etiqueta(cancelTargetId)}? No genera cuenta por pagar. La factura se conserva en el listado con estatus Cancelada y ya no admite cambios.`}
          confirmText={cancelLock.isPending(cancelTargetId) ? "Cancelando..." : "Cancelar factura"}
          cancelText="Volver"
          closeOnConfirm={false}
          onConfirm={() => runRowAction(cancelLock, cancelTargetId, "Cancelada", setCancelTargetId)}
          confirmColor="red"
        />
      )}
    </div>
  );
}
