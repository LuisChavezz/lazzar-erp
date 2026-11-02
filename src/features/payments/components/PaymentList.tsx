"use client";

import { useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { ReceiptIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { DIALOG_WIDTH_SECTIONED_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useStaleNoticeToast } from "@/src/hooks/useStaleNoticeToast";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { getColumns, PAYMENT_HEADER_FILTERS } from "./PaymentColumns";
import { PaymentDetailDialog } from "./PaymentDetailDialog";
import PaymentForm from "./PaymentForm";
import { usePagos } from "../hooks/usePagos";
import { useCancelPago } from "../hooks/useCancelPago";
import {
  PaymentRowActionsProvider,
  usePendingPaymentIds,
} from "../hooks/usePaymentRowActions";

/**
 * Textos del aviso de la confirmación de cancelar que se cerró porque su pago
 * cambió por fuera (otra persona lo canceló) o ya no está.
 */
const PAYMENT_STALE_MESSAGES = {
  gone: "El pago ya no está disponible. Se actualizó el listado.",
  estadoChanged: (estatus: string) =>
    `El pago cambió a ${estatus.toLowerCase()} y ya no se puede cancelar. Se actualizó el listado.`,
};

export default function PaymentList() {
  const { pagos, hasLoaded, isLoading, isError, error, refetch, isFetching } = usePagos();
  // `mutateAsync` y no `mutate`: el candado se suelta sobre la PROMESA de cada
  // llamada; los callbacks por llamada de `mutate` solo corren para la última.
  const { mutateAsync: cancelPagoAsync } = useCancelPago();
  // Cancelaciones en vuelo POR PAGO, leídas de la MutationCache: `isPending` del
  // hook solo recuerda su última llamada y no dice QUÉ pago se está cancelando.
  const busyIds = usePendingPaymentIds();
  // Candado SÍNCRONO por pago (`useRowActionLock`): `busyIds` llega en un render
  // posterior, así que el segundo clic de un doble clic lo encontraría libre y
  // mandaría otra cancelación. La ref del candado ya está tomada en ese clic.
  const rowLock = useRowActionLock();
  const isBusy = (id: number | null) => id !== null && (busyIds.includes(id) || rowLock.isPending(id));

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de AMBOS diálogos en la vista, no en la celda de acciones: una celda
  // se desmonta al ordenar, filtrar o paginar, y cancelar cambia el `estatus` —
  // que es justo uno de los filtros—, así que con el filtro "Aplicado" activo la
  // fila abandona la tabla en cuanto la mutación optimista corre y un diálogo
  // montado en la celda se cerraría solo a media confirmación.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);
  /** Aviso del diálogo de fila que se cerró por un cambio externo (toast desde un efecto). */
  const setStaleNotice = useStaleNoticeToast();

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  // Columnas estáticas: callbacks y "en vuelo" van por `PaymentRowActionsProvider`
  // (sin `useMemo`/`useCallback`: el React Compiler memoiza el componente). Las
  // opciones de los filtros se arman con el listado completo.
  const columns = withHeaderFilters(getColumns(), pagos, PAYMENT_HEADER_FILTERS);

  const findPago = (id: number | null) =>
    id !== null ? (pagos.find((pago) => pago.id === id) ?? null) : null;

  // El pago cuyo detalle está abierto se busca contra el arreglo COMPLETO que esta
  // vista ya tiene (`pagos` llega sin filtrar; el filtrado ocurre dentro de
  // `DataTable`): sobrevive a que la fila salga de la vista filtrada y muestra el
  // estatus nuevo tras el refetch. Listado y retrieve comparten `PagoSerializer`.
  const detailPago = findPago(openDetailId);

  // El id NO puede sobrevivir a la desaparición de su renglón: si el pago sale
  // del payload, el diálogo se desmontaría pero el id seguiría apuntando a él y
  // cualquier refetch posterior que lo devolviera volvería a abrirlo solo. Se
  // ajusta en RENDER (patrón de estado derivado de React: re-render inmediato
  // sin pintar) y no en un efecto, que dispararía `react-hooks/set-state-in-effect`.
  if (openDetailId !== null && detailPago === null) {
    setOpenDetailId(null);
  }

  // Cancelar solo se ofrece sobre un pago `Aplicado`. Si un refetch muestra que el
  // pago de la confirmación abierta cambió de estatus (otra persona lo canceló) o
  // ya no está, se cierra con aviso: confirmar dispararía un `cancelar/` que ya no
  // aplica. Mientras la cancelación PROPIA está en vuelo no se decide: el
  // optimista ya lo marcó `Cancelado` y la cierra su `onSettled`.
  const staleCancel = getStaleRowDialogNotice({
    resource: "payment",
    targetId: cancelTargetId,
    target: findPago(cancelTargetId),
    statusField: "estatus",
    expectedEstado: "Aplicado",
    isBusy: isBusy(cancelTargetId),
    messages: PAYMENT_STALE_MESSAGES,
  });
  if (staleCancel) {
    setCancelTargetId(null);
    setStaleNotice(staleCancel);
  }

  const cancelTargetLabel = cancelTargetId !== null ? `#${cancelTargetId}` : "";
  const isCancelTargetBusy = isBusy(cancelTargetId);

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nuevo pago"— sigue disponible durante la carga y ante un error.
  return (
    <PaymentRowActionsProvider
      value={{
        onViewDetail: (pago) => setOpenDetailId(pago.id),
        onCancel: (pago) => setCancelTargetId(pago.id),
        busyIds,
      }}
    >
      <div className="h-full flex flex-col min-h-0 space-y-6">
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            columns={columns}
            data={pagos}
            baseDataCount={pagos.length}
            searchPlaceholder="Buscar por proveedor, referencia o cuenta..."
            fillHeight
            onRefetch={refetch}
            isRefetching={isFetching}
            emptyMessage="No hay pagos registrados."
            isLoading={isLoading}
            isError={showError}
            errorTitle="Error al cargar los pagos"
            errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
            onErrorRetry={refetch}
            loadingAriaLabel="Cargando pagos"
            getRowId={(row) => String(row.id)}
            // Un alta nueva aparece tras invalidar; sin esto, quien esté parado en la
            // página 2 no vería el pago que acaba de registrar.
            paginationResetKey={pagos.length}
            actionButton={
              <MainDialog
                title={
                  <DialogHeader
                    title="Registrar Pago"
                    subtitle="Aplicación contra cuentas por pagar"
                    statusColor="emerald"
                    icon={ReceiptIcon}
                  />
                }
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                maxWidth={DIALOG_WIDTH_SECTIONED_FORM}
                trigger={
                  <Button
                    variant="primary"
                    rounded="full"
                    className="hover:scale-105 active:scale-95"
                  >
                    + Nuevo pago
                  </Button>
                }
              >
                {/* Se monta solo mientras el diálogo está abierto: así los catálogos
                    del formulario se piden bajo demanda y cada alta arranca limpia. */}
                {isFormOpen && <PaymentForm onSuccess={() => setIsFormOpen(false)} />}
              </MainDialog>
            }
          />
        </div>

        {detailPago && (
          <PaymentDetailDialog
            pago={detailPago}
            open={true}
            onOpenChange={(open) => {
              if (!open) setOpenDetailId(null);
            }}
          />
        )}

        {cancelTargetId !== null && (
          <ConfirmDialog
            open={true}
            onOpenChange={(open) => {
              if (!open) setCancelTargetId(null);
            }}
            title="Cancelar Pago"
            description={`¿Deseas cancelar el pago ${cancelTargetLabel}? Se revertirán los saldos de las cuentas por pagar aplicadas y su movimiento bancario quedará cancelado. El pago se conserva en el listado con estatus Cancelado.`}
            confirmText={isCancelTargetBusy ? "Cancelando..." : "Cancelar pago"}
            cancelText="Volver"
            // `closeOnConfirm={false}`: por defecto el diálogo se cierra al instante
            // y la etiqueta de "Cancelando..." nunca alcanzaría a pintarse (está
            // documentado en el prop). El cierre lo hace `onSettled`, cuando el
            // refetch ya terminó.
            closeOnConfirm={false}
            onConfirm={() => {
              // Un pago ya en vuelo no se vuelve a mandar (doble clic, o reabrir
              // tras "Volver" mientras su cancelación sigue pendiente).
              const id = cancelTargetId;
              if (isBusy(id) || !rowLock.acquire(id)) return;
              cancelPagoAsync(id)
                // El hook ya avisó del error con su toast; aquí solo se evita el
                // rechazo no manejado de la promesa.
                .catch(() => {})
                .finally(() => {
                  rowLock.release(id);
                  // Solo cierra SU confirmación: si mientras tanto se cerró con
                  // "Volver" y se abrió la de otro pago, esa sigue abierta.
                  setCancelTargetId((current) => (current === id ? null : current));
                });
            }}
            confirmColor="amber"
          />
        )}
      </div>
    </PaymentRowActionsProvider>
  );
}
