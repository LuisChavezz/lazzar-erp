"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { Invoice } from "../interfaces/invoice.interface";
import { downloadInvoicePdf } from "../services/pdf.actions";

export const downloadInvoicePdfMutationKey = ["download-invoice-pdf"] as const;

export const useDownloadInvoicePdf = () => {
  return useMutation({
    mutationKey: downloadInvoicePdfMutationKey,
    // Recibe la factura completa (la fila ya trae `factura_detalles` y los
    // totales), así que no se re-consulta el backend para descargar.
    mutationFn: async (invoice: Invoice) => {
      await downloadInvoicePdf(invoice);
    },
    onSuccess: () => {
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo generar el PDF de la factura"));
    },
  });
};
