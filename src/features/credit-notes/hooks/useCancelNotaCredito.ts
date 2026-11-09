import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { cancelarNotaCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { invalidateCreditNoteQueries } from "./invalidateCreditNoteQueries";
import { cancelNotaCreditoErrorMessage, logUnexpectedError } from "../utils/creditNoteErrors";
import { getCreditNoteCancelBlockReason } from "../utils/creditNoteStamping";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { fetchFreshNotaCredito } from "./fetchFreshNotaCredito";

/**
 * Cancela una nota de crédito
 * (`POST /finanzas/notas-credito/{id}/cancelar/`).
 *
 * Mismo molde que `useCancelPago`: optimismo de cambio de ESTATUS (no de
 * borrado) — cancelar → instantánea → marcar la fila → revertir en `onError` →
 * invalidar en `onSettled`. Aquí el optimismo sí es adecuado (a diferencia de
 * `useEmitirNotaCredito`): la acción es idempotente y sus precondiciones de
 * negocio (sin CFDI timbrado ni timbrado pendiente) se revisan antes del POST
 * sobre la nota fresca; el backend las vuelve a exigir y, si cambiaron entre
 * tanto, responde `400 {"cfdi": [...]}` y el optimista se revierte.
 *
 * El registro NUNCA sale del listado: solo cambia su `estatus` a `Cancelada`,
 * por eso el optimista MARCA la fila en vez de filtrarla.
 *
 * Antes del POST pide la nota FRESCA (`fetchFreshNotaCredito`) y se detiene,
 * con `PrecheckError` (que revierte el optimista), si ya está cancelada,
 * timbrada o con el timbrado pendiente (`getCreditNoteCancelBlockReason`). Un
 * `Borrador` sí se cancela: nunca tuvo CFDI.
 *
 * `onSettled` refresca nota, factura, cuenta por cobrar y pedido
 * (`invalidateCreditNoteQueries`): cancelar una nota EMITIDA devuelve el
 * importe acreditado al saldo de la cuenta por cobrar y reajusta su estatus.
 */
/**
 * Llave de la cancelación: el listado lee de la `MutationCache` qué notas
 * tienen una cancelación en vuelo (`usePendingRecordIds`; la variable es el id).
 */
export const cancelNotaCreditoMutationKey = ["cancelar-nota-credito"] as const;

export const useCancelNotaCredito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: cancelNotaCreditoMutationKey,
    mutationFn: async (id: number) => {
      // Retrieve FRESCO antes del POST: el listado puede tener hasta 15 min y
      // otra sesión pudo emitir (y con eso timbrar) o cancelar la nota. El
      // backend rechaza cancelar una nota timbrada o con el timbrado pendiente
      // (`400 {"cfdi": [...]}`, #612 y #904); la guarda lo detecta antes, con
      // un mensaje propio, en vez de esperar ese rechazo.
      const current = await fetchFreshNotaCredito(queryClient, id);
      const label = current.folio || `#${current.id}`;
      if (current.estatus === "Cancelada") {
        throw new PrecheckError(`La nota ${label} ya estaba cancelada.`);
      }
      const blockReason = getCreditNoteCancelBlockReason(current);
      if (blockReason) throw new PrecheckError(blockReason);
      return cancelarNotaCredito(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["credit-notes"] });
      const previousNotas = queryClient.getQueryData<NotaCredito[]>([
        "credit-notes",
      ]);

      if (previousNotas) {
        queryClient.setQueryData<NotaCredito[]>(["credit-notes"], (old) =>
          old
            ? old.map((nota) =>
                nota.id === id
                  ? { ...nota, estatus: "Cancelada" as const }
                  : nota,
              )
            : [],
        );
      }

      return { previousNotas };
    },
    onError: (err, _id, context) => {
      if (context?.previousNotas) {
        queryClient.setQueryData(["credit-notes"], context.previousNotas);
      }
      logUnexpectedError(err);
      toast.error(cancelNotaCreditoErrorMessage(err));
    },
    // Se devuelve una promesa para que la mutación siga "pending" hasta que el
    // refetch de la nota termine: así el listado nunca muestra un estado
    // intermedio y el diálogo de confirmación (con `closeOnConfirm={false}`)
    // puede cerrarse aquí.
    onSettled: () => invalidateCreditNoteQueries(queryClient, "balances"),
    onSuccess: () => {
      toast.success("Nota de crédito cancelada correctamente");
    },
  });
};
