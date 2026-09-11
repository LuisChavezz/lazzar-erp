import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deletePoliza } from "../services/actions";
import { parsePolizaError } from "../utils/parsePolizaError";
import type { Poliza } from "../interfaces/poliza.interface";

/**
 * Elimina FÍSICAMENTE una póliza en borrador (`DELETE /finanzas/polizas/{id}/`).
 *
 * Mismo molde que `useDeleteNotaCredito`: optimista de BORRADO —a diferencia de
 * la cancelación, que marca la fila—, así que se cancelan las consultas en vuelo,
 * se toma la instantánea, se quita la fila, se revierte en `onError` y se
 * invalida en `onSettled`.
 *
 * El error se normaliza con `parsePolizaError` y no con `extractErrorMessage`: el
 * listado puede estar rancio (otra pestaña, otro usuario) y el DELETE caer sobre
 * una póliza que ya se contabilizó. Ese rechazo llega como lista de nivel
 * superior, `["No se puede eliminar una póliza contabilizada. Cancelela
 * primero."]`, una forma de DRF que `extractErrorMessage` (que solo lee
 * `{ error: string }`) no desenvuelve, dejando al usuario con un "Request failed
 * with status code 400" en vez del motivo real.
 */
export const useDeletePoliza = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePoliza(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["polizas"] });
      const previousPolizas = queryClient.getQueryData<Poliza[]>(["polizas"]);

      if (previousPolizas) {
        queryClient.setQueryData<Poliza[]>(["polizas"], (old) =>
          old ? old.filter((poliza) => poliza.id !== id) : [],
        );
      }

      return { previousPolizas };
    },
    onError: (err, _id, context) => {
      if (context?.previousPolizas) {
        queryClient.setQueryData(["polizas"], context.previousPolizas);
      }
      console.error(err);
      // Solo `messages` —no se cae a `parsed.formError`—, igual que en notas de
      // crédito: cuando el parser no extrae ningún mensaje, ese campo trae un
      // genérico redactado para el ALTA ("Error al registrar la póliza") o el
      // propio texto de axios, y ninguno describe un borrado.
      const parsed = parsePolizaError(err);
      toast.error(
        parsed.messages.length > 0
          ? parsed.messages.join("\n")
          : "Error al eliminar la póliza",
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["polizas"] }),
    onSuccess: () => {
      toast.success("Borrador de póliza eliminado correctamente");
    },
  });
};
