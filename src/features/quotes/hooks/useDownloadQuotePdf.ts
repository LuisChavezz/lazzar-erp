"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getQuoteById } from "../services/actions";
import { downloadQuotePdf } from "../services/pdf.actions";
import { resolveQuoteMonedaCodigo } from "../utils/resolveQuoteMonedaCodigo";

export const downloadQuotePdfMutationKey = ["download-quote-pdf"] as const;

export const useDownloadQuotePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: downloadQuotePdfMutationKey,
    mutationFn: async (quoteId: number) => {
      const quote = await getQuoteById(quoteId);
      // Los importes van en la moneda de la cotización (sin símbolo si no se resuelve).
      const monedaCodigo = await resolveQuoteMonedaCodigo(queryClient, quote);
      await downloadQuotePdf(quote, monedaCodigo);
    },
    onSuccess: () => {
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "No se pudo generar el PDF de la cotizacion"
      );
    },
  });
};
