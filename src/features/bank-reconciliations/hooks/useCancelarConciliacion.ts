import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelarConciliacion } from "../services/actions";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";
import { CONCILIACIONES_KEY_ROOT } from "./useConciliaciones";

const FALLBACK = "Error al cancelar la conciliación";

/**
 * Cancela una conciliación: `POST /{id}/cancelar/`.
 *
 * Mismo molde que `useCancelarPoliza`: optimismo de cambio de ESTATUS (no de
 * borrado) — cancelar lo en vuelo → instantánea → marcar la fila → revertir en
 * `onError` → invalidar en `onSettled`. Aquí el optimismo es seguro porque la
 * pantalla solo ofrece cancelar un `Borrador`: la acción es idempotente, no
 * tiene precondiciones sobre ese estatus y no revierte nada —un borrador
 * todavía no marcó ningún movimiento como `Conciliado`—.
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
export const useCancelarConciliacion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => cancelarConciliacion(id),
    onMutate: async (id) => {
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
    onError: (error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error(error);
      toast.error(firstDrfFieldMessage(error) ?? FALLBACK);
    },
    onSuccess: () => {
      toast.success("Conciliación cancelada correctamente");
    },
    // Se devuelve la promesa para que la mutación siga "pending" hasta que el
    // refetch termine: así el listado nunca muestra un estado intermedio.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT }),
  });
};
