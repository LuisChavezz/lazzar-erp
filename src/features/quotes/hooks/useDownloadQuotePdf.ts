"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { downloadQuotePdf } from "../services/pdf.actions";

export const downloadQuotePdfMutationKey = ["download-quote-pdf"] as const;

export const useDownloadQuotePdf = () => {
  return useMutation({
    mutationKey: downloadQuotePdfMutationKey,
    mutationFn: (quoteId: number) => downloadQuotePdf(quoteId),
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
