"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { updateQuoteStatus } from "../services/actions";
import type { QuoteById } from "../interfaces/quote.interface";

// ─── Variables de la mutación ─────────────────────────────────────────────────
interface UpdateQuoteStatusVars {
  /** ID de la cotización a actualizar */
  id: number;
  /** Nuevo estatus (id de la columna destino) */
  estatus: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useUpdateQuoteStatus = () => {
  const queryClient = useQueryClient();

  return useMutation<QuoteById, unknown, UpdateQuoteStatusVars>({
    mutationFn: ({ id, estatus }) => updateQuoteStatus(id, estatus),
    onSuccess: () => {
      // Refrescar la lista de cotizaciones para mantener coherencia con el servidor
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data?.detail as string | undefined) ??
            "Error al actualizar el estatus")
          : "Error al actualizar el estatus";
      toast.error(message);
    },
  });
};
