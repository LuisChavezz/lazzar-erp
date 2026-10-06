import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { getSupplierInvoiceMergedPdf } from "../services/actions";
import { mergedPdfFileName } from "../constants/supplierInvoicePdf";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { errorStatus, mergedPdfErrorMessage } from "../utils/supplierInvoicePdfErrors";

export const downloadSupplierInvoiceMergedPdfMutationKey = [
  "download-supplier-invoice-merged-pdf",
] as const;

/**
 * Descarga el documento fusionado OC + RC + factura del proveedor, generado por
 * el backend. Recibe la fila (no el id) para armar el nombre del archivo, que el
 * navegador no puede leer del servidor (ver `mergedPdfFileName`).
 */
export const useDownloadSupplierInvoiceMergedPdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: downloadSupplierInvoiceMergedPdfMutationKey,
    mutationFn: async (factura: FacturaProveedor) => {
      const blob = await getSupplierInvoiceMergedPdf(factura.id);
      downloadBlob(blob, mergedPdfFileName(factura));
    },
    onSuccess: () => {
      toast.success("Documento OC + RC + factura descargado");
    },
    onError: (error) => {
      toast.error(mergedPdfErrorMessage(error), { duration: 9000 });
      // 400 (`pdf_adjunto`: la fila decía que había PDF y ya no) o 404: la fila
      // estaba vieja; se refresca para que deje de ofrecer la descarga.
      const status = errorStatus(error);
      if (status === 400 || status === 404) {
        return queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
      }
    },
  });
};
