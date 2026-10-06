"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { downloadPurchaseOrderPdf } from "../services/pdf.actions";
import { canSeeAmounts } from "../utils/purchaseOrderFinance";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

/**
 * Mensaje cuando el rol del usuario no puede ver los importes de la orden. El
 * PDF es el documento de la orden de compra (el que puede compartirse con el
 * proveedor; se descarga en cualquier estatus): sin precios sería una orden
 * rota, no un documento incompleto, así que la acción se bloquea aquí —con el
 * detalle YA filtrado por el backend— en vez de en el listado, cuya fila no
 * está filtrada.
 */
const SIN_IMPORTES_MSG =
  "No tienes acceso a los importes de esta orden, así que no puede generarse su PDF.";

export const downloadPurchaseOrderPdfMutationKey = ["download-purchase-order-pdf"] as const;

export const useDownloadPurchaseOrderPdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: downloadPurchaseOrderPdfMutationKey,
    mutationFn: async (orderId: number) => {
      // NO se reutiliza el cache del detalle (`staleTime: 0` fuerza el GET),
      // igual que en el correo: el documento depende del `estatus` REAL —una
      // orden cancelada debe salir con su marca CANCELADA aunque el detalle
      // cacheado (hasta 15 min) diga todavía "autorizada".
      const order = await queryClient.fetchQuery({
        ...purchaseOrderQueryOptions(orderId),
        staleTime: 0,
      });

      // El detalle ya viene filtrado por rol: si faltan los importes, no se
      // genera un PDF sin precios. Se lanza para que `onError` lo muestre.
      if (!canSeeAmounts(order)) {
        throw new Error(SIN_IMPORTES_MSG);
      }

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
