"use client";

import { useCallback, useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getColumns } from "./PaymentColumns";
import { PaymentDetailDialog } from "./PaymentDetailDialog";
import PaymentForm from "./PaymentForm";
import { usePagos } from "../hooks/usePagos";
import { useCancelPago } from "../hooks/useCancelPago";

/**
 * Filtros de la tabla. `DataTable` filtra en MEMORIA comparando
 * `String(row[configId]) === value`, así que los valores son los del enum crudo
 * del backend. El endpoint SÍ acepta `?estatus=` y `?metodo_pago=`, pero la
 * tabla no tiene puente hacia parámetros de servidor (ver `getPagos`).
 */
const ESTATUS_FILTER = [
  { value: "Aplicado", label: "Aplicado" },
  { value: "Cancelado", label: "Cancelado" },
  { value: "Borrador", label: "Borrador" },
];

const METODO_FILTER = [
  { value: "Transferencia", label: "Transferencia" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Cheque", label: "Cheque" },
  { value: "Tarjeta", label: "Tarjeta" },
];

export default function PaymentList() {
  const { pagos, hasLoaded, isLoading, isError, error, refetch, isFetching } = usePagos();
  const { mutate: cancelPago, isPending: isCancelling } = useCancelPago();

  const [isFormOpen, setIsFormOpen] = useState(false);
  // Estado de AMBOS diálogos en la vista, no en la celda de acciones: una celda
  // se desmonta al ordenar, filtrar o paginar, y cancelar cambia el `estatus` —
  // que es justo uno de los filtros—, así que con el filtro "Aplicado" activo la
  // fila abandona la tabla en cuanto la mutación optimista corre y un diálogo
  // montado en la celda se cerraría solo a media confirmación.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  const [cancelTargetId, setCancelTargetId] = useState<number | null>(null);

  // Un error de refetch transitorio no debe descartar la tabla ya cargada; solo
  // se trata como error "de pantalla completa" si la consulta nunca cargó.
  const showError = isInitialLoadError(isError, hasLoaded);

  const handleViewDetail = useCallback((id: number) => setOpenDetailId(id), []);
  const handleCancel = useCallback((id: number) => setCancelTargetId(id), []);

  const columns = useMemo(
    () => getColumns(handleViewDetail, handleCancel),
    [handleViewDetail, handleCancel],
  );

  // El pago cuyo detalle está abierto se busca contra el arreglo que esta vista
  // ya tiene: el diálogo no vuelve a suscribirse al listado para localizar un
  // renglón (listado y retrieve comparten `PagoSerializer`, líneas incluidas).
  const detailPago =
    openDetailId !== null
      ? pagos.find((pago) => pago.id === openDetailId) ?? null
      : null;

  // El id NO puede sobrevivir a la desaparición de su renglón: si el pago sale
  // del payload, el diálogo se desmontaría pero el id seguiría apuntando a él y
  // cualquier refetch posterior que lo devolviera volvería a abrirlo solo. Se
  // ajusta en RENDER (patrón de estado derivado de React: re-render inmediato
  // sin pintar) y no en un efecto, que dispararía `react-hooks/set-state-in-effect`.
  if (openDetailId !== null && detailPago === null) {
    setOpenDetailId(null);
  }

  // El objetivo de la cancelación SÍ sobrevive a que la fila salga de la vista
  // FILTRADA: el diálogo se alimenta solo del id, así que el flujo termina aunque
  // el filtro "Aplicado" expulse la fila en cuanto el optimista la marque.
  //
  // Lo que NO puede sobrevivir es que el pago desaparezca del payload completo
  // (`pagos` llega sin filtrar; el filtrado ocurre dentro de `DataTable`). Si el
  // registro ya no existe, confirmar dispararía un `cancelar/` contra un id
  // inexistente y el id quedaría fijado, dejando el diálogo sin forma de cerrarse
  // salvo a mano. Se ajusta en RENDER, igual que `openDetailId`.
  if (cancelTargetId !== null && !pagos.some((pago) => pago.id === cancelTargetId)) {
    setCancelTargetId(null);
  }

  const cancelTargetLabel = cancelTargetId !== null ? `#${cancelTargetId}` : "";

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, de modo que el toolbar —búsqueda, filtros, refrescar, columnas y el
  // botón "+ Nuevo pago"— sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={pagos}
        baseDataCount={pagos.length}
        title="Pagos a Proveedor"
        searchPlaceholder="Buscar por proveedor, referencia o cuenta..."
        filterConfig={[
          { id: "estatus", label: "Estatus", options: ESTATUS_FILTER },
          { id: "metodo_pago", label: "Método", options: METODO_FILTER },
        ]}
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
              />
            }
            open={isFormOpen}
            onOpenChange={setIsFormOpen}
            maxWidth="1100px"
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
          confirmText={isCancelling ? "Cancelando..." : "Cancelar pago"}
          cancelText="Volver"
          // `closeOnConfirm={false}`: por defecto el diálogo se cierra al instante
          // y la etiqueta de "Cancelando..." nunca alcanzaría a pintarse (está
          // documentado en el prop). El cierre lo hace `onSettled`, cuando el
          // refetch ya terminó.
          closeOnConfirm={false}
          onConfirm={() => {
            cancelPago(cancelTargetId, {
              onSettled: () => setCancelTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
    </div>
  );
}
