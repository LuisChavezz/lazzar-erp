"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { downloadQuotePdf } from "../services/pdf.actions";
import { loadQuoteForDocument } from "../utils/loadQuoteForDocument";

export const downloadQuotePdfMutationKey = ["download-quote-pdf"] as const;

export const useDownloadQuotePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: downloadQuotePdfMutationKey,
    mutationFn: async (quoteId: number) => {
      // Los importes van en la moneda de la cotización; si el catálogo no carga, se aborta.
      const { quote, monedaCodigo } = await loadQuoteForDocument(queryClient, quoteId);
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
