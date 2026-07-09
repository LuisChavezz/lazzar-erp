"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { downloadPurchaseOrderPdf } from "../services/pdf.actions";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

export const downloadPurchaseOrderPdfMutationKey = ["download-purchase-order-pdf"] as const;

export const useDownloadPurchaseOrderPdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: downloadPurchaseOrderPdfMutationKey,
    mutationFn: async (orderId: number) => {
      // Reutiliza el cache de `usePurchaseOrder` (p. ej. si el usuario ya
      // abrió el diálogo de detalle) en vez de re-consultar siempre.
      const order = await queryClient.fetchQuery(purchaseOrderQueryOptions(orderId));
      await downloadPurchaseOrderPdf(order);
    },
    onSuccess: () => {
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo generar el PDF de la orden de compra"));
    },
  });
};
