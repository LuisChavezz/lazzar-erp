"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/src/components/DataTable";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { useRowActionLock } from "@/src/hooks/useRowActionLock";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { CXP_ESTATUS_CONFIG } from "../constants/cxpEstatus";
import { useCuentasPorPagar } from "../hooks/useCuentasPorPagar";
import { useDeleteCuentaPorPagar } from "../hooks/useDeleteCuentaPorPagar";
import {
  isCuentaPorPagarVencida,
  todayInBackendTimeZone,
} from "../utils/accounts-payable.utils";
import {
  CXP_CONFLICT_FALLBACK_MESSAGE,
  parseCuentaPorPagarError,
} from "../utils/parseCuentaPorPagarError";
import type { CxPEstatus } from "../interfaces/accounts-payable.interface";
import { getColumns } from "./AccountsPayableColumns";
import { AccountsPayableDetailDialog } from "./AccountsPayableDetailDialog";
import { RegisterAccountPayableDialog } from "./RegisterAccountPayableDialog";

/**
 * Filtro de estatus. `DataTable` filtra en MEMORIA comparando
 * `String(row.estatus) === value`, así que los valores son los del enum crudo.
 * Se derivan de `CXP_ESTATUS_CONFIG` para que filtro y badge cubran siempre los
 * mismos cuatro valores — sin `Vencida`, que no es un estatus (la marca tiene su
 * propio filtro, "Solo vencidas").
 */
const ESTATUS_FILTER = (Object.keys(CXP_ESTATUS_CONFIG) as CxPEstatus[]).map(
  (value) => ({ value, label: value }),
);

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
  } | null>(null);
  /** Último 409 del borrado, atado a SU cuenta: habilita "Reintentar". */
  const [deleteConflict, setDeleteConflict] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [soloVencidas, setSoloVencidas] = useState(false);

  // Candado de reenvío: un DELETE repetido responde 404 y pintaría un error justo
  // después de un borrado que sí funcionó.
  const deleteLock = useRowActionLock();

  // Un error de refetch transitorio no descarta la tabla ya cargada.
  const showError = isInitialLoadError(isError, hasLoaded);

  // "Hoy" se calcula UNA vez por render y lo comparten la tabla, el filtro "Solo
  // vencidas" y el detalle: los tres usan `isCuentaPorPagarVencida`.
  const today = todayInBackendTimeZone();
  const vencidas = cuentasPorPagar.filter((cuenta) =>
    isCuentaPorPagarVencida(cuenta, today),
  );
  // Filtro EN MEMORIA con la misma función que pinta la marca — no una segunda
  // petición con `?vencidas=true`, que podría discrepar de lo que se ve.
  const cuentasVisibles = soloVencidas ? vencidas : cuentasPorPagar;

  const handleDelete = (id: number) => {
    const cuenta = cuentasPorPagar.find((item) => item.id === id);
    const folio = cuenta?.factura_proveedor_folio;
    setDeleteConflict(null);
    setDeleteTarget({
      id,
      etiqueta: folio ? `cuenta por pagar #${id} (factura ${folio})` : `cuenta por pagar #${id}`,
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

  const columns = getColumns({
    today,
    onViewDetail: setOpenDetailId,
    onDelete: handleDelete,
    onGoToPayments: () => router.push("/finance/payments"),
  });

  // El detalle se busca en el arreglo COMPLETO (no en el filtrado): si "Solo
  // vencidas" está activo y un pago la saca de esa vista, el diálogo sigue
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

  const conflictMessage =
    deleteTarget !== null && deleteConflict?.id === deleteTarget.id
      ? deleteConflict.message
      : null;

  // `DataTable` se monta SIEMPRE: recibe `isLoading`/`isError` y alterna solo su
  // cuerpo, así que el toolbar —búsqueda, filtros, "Solo vencidas" y "Registrar
  // CxP faltante"— sigue disponible durante la carga y ante un error.
  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={cuentasVisibles}
        baseDataCount={cuentasVisibles.length}
        title="Cuentas por Pagar"
        searchPlaceholder="Buscar por proveedor o factura..."
        filterConfig={[{ id: "estatus", label: "Estatus", options: ESTATUS_FILTER }]}
        onRefetch={refetch}
        isRefetching={isFetching}
        emptyMessage={
          soloVencidas
            ? "No hay cuentas por pagar vencidas."
            : "No hay cuentas por pagar registradas."
        }
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las cuentas por pagar"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={refetch}
        loadingAriaLabel="Cargando cuentas por pagar"
        getRowId={(row) => String(row.id)}
        // Un alta nueva o cambiar "Solo vencidas" vuelven a la página 1.
        paginationResetKey={`${cuentasPorPagar.length}-${soloVencidas}`}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={soloVencidas}
              onClick={() => setSoloVencidas((prev) => !prev)}
              className={`inline-flex items-center whitespace-nowrap rounded-full border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                soloVencidas
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              }`}
            >
              Solo vencidas{vencidas.length > 0 ? ` (${vencidas.length})` : ""}
            </button>
            <RegisterAccountPayableDialog />
          </div>
        }
      />

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
          onOpenChange={(open) => {
            if (!open) {
              closeDeleteDialog();
              setDeleteConflict(null);
            }
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
  );
}
