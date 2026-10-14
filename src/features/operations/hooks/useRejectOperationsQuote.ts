"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { QUOTE_COMENTARIOS_KEY } from "@/src/features/quotes/hooks/useQuoteComentarios";
import { rejectOperationsQuote } from "../services/actions";
import { applyOperationsQuoteActionResult } from "./createOperationsQuoteMutation";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

export const rejectOperationsQuoteMutationKey = [
  "reject-operations-quote",
] as const;

export interface RejectOperationsQuoteVariables {
  id: number;
  /** Motivo, ya recortado y no vacío (lo garantiza `quoteRejectSchema`). */
  comentario: string;
}

interface UseRejectOperationsQuoteOptions {
  /**
   * Si se pasa, el 400 sobre `comentario` se entrega aquí EN VEZ de un toast,
   * para que el diálogo lo pinte bajo su campo y siga abierto.
   */
  onReasonError?: (message: string) => void;
}

/**
 * Rechaza una cotización con motivo: `POST /ventas/mesa-control/{id}/rechazar/`
 * con `{ comentario }`. No sale de la fábrica `createOperationsQuoteMutation`
 * porque lleva cuerpo y un manejo de errores propio.
 *
 * Errores: el 400 de `comentario` va a `onReasonError`; el resto (400
 * `cotizacion`/`permiso` —los de permiso llegan como 400, no 403—, 404, red)
 * se avisa por toast CON el mensaje del backend.
 */
export const useRejectOperationsQuote = ({
  onReasonError,
}: UseRejectOperationsQuoteOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectOperationsQuoteMutationKey,
    mutationFn: ({ id, comentario }: RejectOperationsQuoteVariables) =>
      rejectOperationsQuote(id, comentario),
    onSuccess: async (response, { id }) => {
      await applyOperationsQuoteActionResult(queryClient, response);
      queryClient.invalidateQueries({ queryKey: [QUOTE_COMENTARIOS_KEY, id] });
      toast.success("Cotización rechazada correctamente");
    },
    onError: (error, { id }) => {
      const reasonMessage = drfFieldMessage(error, "comentario");
      if (reasonMessage && onReasonError) {
        onReasonError(reasonMessage);
        return;
      }
      toast.error(
        drfActionErrorMessage(
          error,
          "No se pudo rechazar la cotización. Intenta de nuevo.",
          "La cotización ya no está disponible para rechazo."
        )
      );
      // Un 400 de estatus o un 404 significan que lo pintado ya no es el
      // estado real: se relee para que la vista lo refleje.
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
    },
  });
};
