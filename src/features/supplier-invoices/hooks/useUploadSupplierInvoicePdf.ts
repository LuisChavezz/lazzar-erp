import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { uploadSupplierInvoicePdf } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { errorStatus, uploadPdfErrorMessage } from "../utils/supplierInvoicePdfErrors";

export const uploadSupplierInvoicePdfMutationKey = ["upload-supplier-invoice-pdf"] as const;

export interface UploadSupplierInvoicePdfVariables {
  /**
   * La FILA de la factura, no solo su id: decide el texto del aviso (adjuntar
   * vs reemplazar) y da el folio. La respuesta de `adjuntar-pdf/` trae solo los
   * campos del adjunto.
   */
  factura: FacturaProveedor;
  file: File;
}

/**
 * Adjunta o reemplaza el PDF del proveedor de una factura.
 *
 * Los callbacks viven en el HOOK (no en `mutate`), así que corren para cada
 * llamada aunque haya varias filas subiendo a la vez. `onSuccess` devuelve la
 * promesa del refetch: la mutación sigue "pending" hasta que la fila ya muestra
 * el adjunto nuevo, y la etiqueta "Subiendo…" cambia directo a "Reemplazar PDF".
 *
 * Solo se invalida `["facturas-proveedor"]` (por prefijo: listado, consulta por
 * recepción y selector de CxP), NO `invalidateSupplierInvoiceQueries`: adjuntar
 * un PDF no cambia la cuenta por pagar ni la orden de compra, y refrescarlas
 * alargaría el "Subiendo…" hasta el refetch más lento.
 */
export const useUploadSupplierInvoicePdf = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: uploadSupplierInvoicePdfMutationKey,
    mutationFn: ({ factura, file }: UploadSupplierInvoicePdfVariables) =>
      uploadSupplierInvoicePdf({ id: factura.id, file }),
    onSuccess: (response, { factura }) => {
      const etiqueta = factura.folio || `#${factura.id}`;
      const nombre = response.pdf_adjunto_nombre ? ` "${response.pdf_adjunto_nombre}"` : "";
      toast.success(
        factura.tiene_pdf_adjunto
          ? `PDF${nombre} reemplazado en la factura ${etiqueta}`
          : `PDF${nombre} adjuntado a la factura ${etiqueta}`,
      );
      return queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
    },
    onError: (error) => {
      toast.error(uploadPdfErrorMessage(error), { duration: 7000 });
      // 404: la factura ya no existe para el backend; se refresca para quitarla.
      if (errorStatus(error) === 404) {
        return queryClient.invalidateQueries({ queryKey: ["facturas-proveedor"] });
      }
    },
  });
};
