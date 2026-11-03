import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelarConciliacion } from "../services/actions";
import type {
  ConciliacionBancaria,
  ConciliacionEstatus,
} from "../interfaces/bank-reconciliation.interface";
import { CONCILIACIONES_KEY_ROOT } from "./useConciliaciones";
import { invalidateMovimientoQueries } from "./invalidateMovimientoQueries";

const FALLBACK = "Error al cancelar la conciliación";

/**
 * Qué conciliación se cancela: su id y el estatus que tenía al ABRIR la
 * confirmación, que decide si el optimismo es seguro (ver el hook).
 */
export interface CancelarConciliacionVariables {
  id: number;
  estatus: ConciliacionEstatus;
}

/**
 * Cancela una conciliación: `POST /{id}/cancelar/`.
 *
 * Se ofrece sobre un `Borrador` y sobre una `Cerrada` (nucleo-erp #827), con
 * efectos distintos:
 *
 * - **`Borrador`**: solo cambia de estatus. Optimismo de cambio de ESTATUS
 *   (mismo molde que `useCancelarPoliza`): cancelar lo en vuelo → instantánea →
 *   marcar la fila → revertir en `onError` → invalidar en `onSettled`. Es seguro
 *   porque es idempotente, no tiene precondiciones sobre ese estatus y no
 *   revierte nada: un borrador todavía no marcó ningún movimiento.
 * - **`Cerrada`**: el backend regresa sus movimientos `Conciliado` a
 *   `Pendiente` (salvo los que ampare otra conciliación cerrada), un efecto que
 *   el cliente no puede adelantar. SIN optimismo: se espera al servidor y se
 *   invalida, como `useCerrarConciliacion`.
 *
 * En los dos casos `onSettled` refresca también los movimientos
 * (`invalidateMovimientoQueries`).
 *
 * El registro NUNCA sale del listado: solo cambia su `estatus`, por eso el
 * optimista MARCA la fila en vez de filtrarla.
 *
 * ─── POR QUÉ `setQueriesData` Y NO `setQueryData` ────────────────────────────
 *
 * La llave lleva los parámetros (`["conciliaciones-bancarias", params]`), así
 * que no hay UNA entrada que actualizar: conviven la vista de la pantalla y la
 * consulta de solapamiento del formulario. Se escribe sobre TODAS las entradas
 * del prefijo y se guarda lo que había en cada una para poder revertirlas.
 */
/** Llave de la cancelación: `usePendingConciliacionIds` lee de ella las conciliaciones en vuelo. */
export const cancelarConciliacionMutationKey = ["cancelar-conciliacion"] as const;

export const useCancelarConciliacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: cancelarConciliacionMutationKey,
    mutationFn: ({ id }: CancelarConciliacionVariables) => cancelarConciliacion(id),
    onMutate: async ({ id, estatus }) => {
      if (estatus !== "Borrador") return { previous: [] };

      await queryClient.cancelQueries({ queryKey: CONCILIACIONES_KEY_ROOT });

      const previous = queryClient.getQueriesData<ConciliacionBancaria[]>({
        queryKey: CONCILIACIONES_KEY_ROOT,
      });

      queryClient.setQueriesData<ConciliacionBancaria[]>(
        { queryKey: CONCILIACIONES_KEY_ROOT },
        (old) =>
          old
            ? old.map((conciliacion) =>
                conciliacion.id === id
                  ? { ...conciliacion, estatus: "Cancelada" as const }
                  : conciliacion,
              )
            : old,
      );

      return { previous };
    },
    onError: (error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error(error);
      toast.error(firstDrfFieldMessage(error) ?? FALLBACK);
    },
    onSuccess: (_data, { estatus }) => {
      toast.success(
        estatus === "Cerrada"
          ? "Conciliación cancelada: sus movimientos regresaron a Pendiente"
          : "Conciliación cancelada correctamente",
      );
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio. Los
    // movimientos se refrescan sin bloquearla.
    onSettled: () => {
      void invalidateMovimientoQueries(queryClient);
      return queryClient.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT });
    },
  });
};
