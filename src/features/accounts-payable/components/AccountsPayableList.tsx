"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { getMexicoTodayDate } from "@/src/utils/mexicoTime";
import { getStaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useStaleNoticeToast } from "@/src/hooks/useStaleNoticeToast";
import type { CuentaPorPagar, CxPEstatus } from "../interfaces/accounts-payable.interface";
import { useCuentasPorPagar } from "../hooks/useCuentasPorPagar";
import {
  deleteCuentaPorPagarMutationKey,
  useDeleteCuentaPorPagar,
} from "../hooks/useDeleteCuentaPorPagar";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import { AccountsPayableRowActionsProvider } from "../hooks/useAccountsPayableRowActions";
import {
  CXP_CONFLICT_FALLBACK_MESSAGE,
  parseCuentaPorPagarError,
} from "../utils/parseCuentaPorPagarError";
import { getAccountsPayableHeaderFilters, getColumns } from "./AccountsPayableColumns";
import { AccountsPayableDetailDialog } from "./AccountsPayableDetailDialog";
import { RegisterAccountPayableDialog } from "./RegisterAccountPayableDialog";

/**
 * Textos del aviso de la confirmación de borrado que se cerró porque su cuenta
 * cambió por fuera (p. ej. se le aplicó un pago: pasa a `Parcial`/`Pagada` y ya
 * no se puede eliminar).
 */
const CXP_STALE_MESSAGES = {
  gone: "La cuenta por pagar ya no está disponible. Se actualizó el listado.",
  estadoChanged: (estatus: string) =>
    `La cuenta por pagar cambió a ${estatus.toLowerCase()} y ya no se eliminó. Se actualizó el listado.`,
};

export default function AccountsPayableList() {
  const router = useRouter();
  const { cuentasPorPagar, hasLoaded, isLoading, isError, error, refetch, isFetching } =
    useCuentasPorPagar();
  /**
   * Id de la cuenta cuyo borrado se CONFIRMÓ y cuyo diálogo sigue abierto. Se fija
   * al confirmar y se limpia en el mismo evento que cierra el diálogo. El hook la
   * consulta cuando llega un 409 para decidir si el aviso lo pinta el diálogo o un
   * toast; el estado de React no sirve ahí, porque el callback de la mutación
   * conserva el valor del render en que se creó.
   *
   * No se fija al ABRIR (`handleDelete`): ese handler viaja a las columnas, que se
   * construyen durante el render, y escribir una ref desde ahí la volvería
   * accesible en render. Basta con fijarla al confirmar, que es lo único que puede
   * producir un 409.
   */
  const openDeleteIdRef = useRef<number | null>(null);
  // `mutateAsync`: el candado se libera sobre la PROMESA de cada llamada (los
  // callbacks de `mutate` solo corren para la última llamada del observer).
  const { mutateAsync: deleteCuentaAsync } = useDeleteCuentaPorPagar(undefined, {
    isConflictShownInDialog: (id) => openDeleteIdRef.current === id,
  });

  // Estado de los diálogos en la VISTA, no en la celda: una celda se desmonta al
  // ordenar, filtrar o paginar, y el borrado optimista saca la fila de la tabla.
  const [openDetailId, setOpenDetailId] = useState<number | null>(null);
  /**
   * El borrado guarda un OBJETO capturado al abrir, no solo el id: su mutación es
   * optimista y física, así que la fila desaparece del caché al confirmar y un
   * diálogo que dependiera de ella se quedaría sin datos a media mutación —y sin
   * nada que mostrar si el DELETE falla y hay que reintentar—. Mismo patrón que
   * `CreditNoteList`.
   */
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    etiqueta: string;
    /** Estatus con que se ABRIÓ la confirmación: la guarda de obsolescencia compara contra él. */
    estatus: CxPEstatus;
  } | null>(null);
  /** Último 409 del borrado, atado a SU cuenta: habilita "Reintentar". */
  const [deleteConflict, setDeleteConflict] = useState<{
    id: number;
    message: string;
  } | null>(null);
  /** Aviso del diálogo de fila que se cerró por un cambio externo (toast desde un efecto). */
  const setStaleNotice = useStaleNoticeToast();

  // Candado de reenvío: un DELETE repetido responde 404 y pintaría un error justo
  // después de un borrado que sí funcionó.
  const deleteLock = useRowActionLock();
  // Borrados en vuelo leídos de la `MutationCache`: sobreviven a un remontaje
  // de la vista, que deja vacío el candado de fila.
  const pendingDeleteIds = usePendingRecordIds(deleteCuentaPorPagarMutationKey);

  // Un error de refetch transitorio no descarta la tabla ya cargada.
  const showError = isInitialLoadError(isError, hasLoaded);

  // "Hoy" se calcula UNA vez por render y lo comparten la tabla, el filtro de
  // vencida y el detalle: los tres usan `isCuentaPorPagarVencida`.
  const today = getMexicoTodayDate();

  const handleDelete = (cuenta: CuentaPorPagar) => {
    const { id, factura_proveedor_folio: folio } = cuenta;
    setDeleteConflict(null);
    setDeleteTarget({
      id,
      etiqueta: folio ? `cuenta por pagar #${id} (factura ${folio})` : `cuenta por pagar #${id}`,
      estatus: cuenta.estatus,
    });
  };

  /**
   * Cierra el diálogo de borrado y limpia la ref. Sin `id` (Volver/Esc) cierra
   * siempre. Con `id` (resultado de una petición) solo si esa cuenta sigue siendo
   * la confirmada con el diálogo abierto: si el usuario ya lo cerró y abrió el de
   * otra, ese no se toca.
   */
  const closeDeleteDialog = (id?: number) => {
    if (id !== undefined && openDeleteIdRef.current !== id) return;
    openDeleteIdRef.current = null;
    setDeleteTarget(null);
  };

  // Columnas estáticas: callbacks, "hoy" y "en vuelo" van por
  // `AccountsPayableRowActionsProvider`. Las opciones de los filtros se arman con
  // el listado completo.
  const columns = withHeaderFilters(
    getColumns(),
    cuentasPorPagar,
    getAccountsPayableHeaderFilters(today),
  );

  // El detalle se busca en el arreglo COMPLETO (no en el filtrado): si un pago
  // saca la cuenta de la vista filtrada (p. ej. «Vencida»), el diálogo sigue
  // mostrando la cuenta con sus datos nuevos.
  const detailCuenta =
    openDetailId !== null
      ? cuentasPorPagar.find((cuenta) => cuenta.id === openDetailId) ?? null
      : null;

  // El id NO sobrevive a la desaparición de su renglón del payload: si no, un
  // refetch posterior que lo devolviera reabriría el diálogo solo. Se ajusta en
  // RENDER (estado derivado), no en un efecto.
  if (openDetailId !== null && detailCuenta === null) {
    setOpenDetailId(null);
  }

  // Eliminar solo se ofrece sin pagos aplicados, y aplicar un pago siempre mueve
  // el estatus (`Parcial`/`Pagada`): si un refetch muestra que la cuenta de la
  // confirmación abierta cambió de estatus o ya no está, se cierra con aviso.
  // Mientras el borrado PROPIO está en vuelo no se decide: el optimista ya sacó
  // la fila y la cierra el resultado de la petición.
  const staleDelete = getStaleRowDialogNotice({
    resource: "cxp",
    targetId: deleteTarget?.id ?? null,
    target:
      deleteTarget !== null
        ? (cuentasPorPagar.find((cuenta) => cuenta.id === deleteTarget.id) ?? null)
        : null,
    statusField: "estatus",
    expectedEstado: deleteTarget?.estatus ?? "Pendiente",
    isBusy: deleteTarget !== null && deleteLock.isPending(deleteTarget.id),
    messages: CXP_STALE_MESSAGES,
  });
  // La ref de "abierto" no se toca aquí (no se escribe una ref en render): solo
  // vale tras confirmar, y la siguiente confirmación la vuelve a fijar.
  if (staleDelete) {
    setDeleteTarget(null);
    setDeleteConflict(null);
    setStaleNotice(staleDelete);
  }

  const conflictMessage =
    deleteTarget !== null && deleteConflict?.id === deleteTarget.id
      ? deleteConflict.message
      : null;

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, así que el toolbar —búsqueda, filtros y "Registrar CxP faltante"—
  // sigue disponible durante la carga y ante un error.
  return (
    <AccountsPayableRowActionsProvider
      value={{
        onViewDetail: (cuenta) => setOpenDetailId(cuenta.id),
        onDelete: handleDelete,
        onGoToPayments: () => router.push("/finance/payments"),
        today,
        busyIds: deleteTarget !== null && deleteLock.isPending(deleteTarget.id) ? [deleteTarget.id] : [],
      }}
    >
      <div className="h-full flex flex-col min-h-0 space-y-6">
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
          columns={columns}
          data={cuentasPorPagar}
          baseDataCount={cuentasPorPagar.length}
          searchPlaceholder="Buscar por proveedor o factura..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          emptyMessage="No hay cuentas por pagar registradas."
          isLoading={isLoading}
          isError={showError}
          errorTitle="Error al cargar las cuentas por pagar"
          errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
          onErrorRetry={refetch}
          loadingAriaLabel="Cargando cuentas por pagar"
          getRowId={(row) => String(row.id)}
          // Un alta nueva vuelve a la página 1.
          paginationResetKey={cuentasPorPagar.length}
          actionButton={<RegisterAccountPayableDialog />}
        />
        </div>

        {detailCuenta && (
          <AccountsPayableDetailDialog
            cuenta={detailCuenta}
            today={today}
            open={true}
            onOpenChange={(open) => {
              if (!open) setOpenDetailId(null);
            }}
          />
        )}

        {deleteTarget !== null && (
          <ConfirmDialog
            open={true}
            // En vuelo queda abierta y bloqueada, con la misma regla que
            // `guardClose`; el resultado de la petición decide el cierre. Va en
            // línea porque `closeDeleteDialog` escribe una ref, y pasársela al
            // helper durante el render la leería en render (`react-hooks/refs`).
            busy={
              deleteLock.isPending(deleteTarget.id) || pendingDeleteIds.includes(deleteTarget.id)
            }
            onOpenChange={(open) => {
              if (open || deleteLock.isHeld(deleteTarget.id)) return;
              closeDeleteDialog();
              setDeleteConflict(null);
            }}
            title={conflictMessage ? "No se pudo eliminar todavía" : "Eliminar Cuenta por Pagar"}
            // El borrado del backend es FÍSICO: se dice sin rodeos. Solo se ofrece
            // sobre cuentas sin pagos aplicados.
            description={
              conflictMessage
                ? `${conflictMessage} La cuenta no se eliminó; puedes reintentar.`
                : `¿Deseas eliminar la ${deleteTarget.etiqueta}? Se borrará de forma PERMANENTE y no podrá recuperarse.`
            }
            confirmText={
              deleteLock.isPending(deleteTarget.id)
                ? "Eliminando..."
                : conflictMessage
                  ? "Reintentar"
                  : "Eliminar permanentemente"
            }
            cancelText="Volver"
            // `closeOnConfirm={false}`: el cierre lo decide el resultado. Un 409
            // DEJA el diálogo abierto con "Reintentar"; el éxito y cualquier otro
            // error lo cierran (el toast del hook ya explicó el motivo).
            closeOnConfirm={false}
            onConfirm={() => {
              const id = deleteTarget.id;
              if (!deleteLock.acquire(id)) return;
              openDeleteIdRef.current = id;
              setDeleteConflict(null);
              deleteCuentaAsync(id)
                .then(() => closeDeleteDialog(id))
                .catch((err: unknown) => {
                  const parsed = parseCuentaPorPagarError(
                    err,
                    "Error al eliminar la cuenta por pagar.",
                  );
                  if (parsed.kind === "conflict") {
                    setDeleteConflict({
                      id,
                      message: parsed.formError ?? CXP_CONFLICT_FALLBACK_MESSAGE,
                    });
                    return;
                  }
                  closeDeleteDialog(id);
                })
                .finally(() => deleteLock.release(id));
            }}
            confirmColor="red"
          />
        )}
      </div>
    </AccountsPayableRowActionsProvider>
  );
}
