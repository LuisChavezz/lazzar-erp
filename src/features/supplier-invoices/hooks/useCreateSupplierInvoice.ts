import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { createSupplierInvoice } from "../services/actions";
import {
  parseSupplierInvoiceError,
  supplierInvoiceErrorToastMessage,
  type ParsedSupplierInvoiceError,
} from "../utils/parseSupplierInvoiceError";
import { invalidateSupplierInvoiceQueries } from "./invalidateSupplierInvoiceQueries";

const FALLBACK = "Error al guardar la factura de proveedor";

/**
 * Mutación de alta de factura de proveedor. `onServerError` recibe el error ya
 * normalizado para que el formulario lo reparta entre banner, cabecera y
 * renglones.
 *
 * El toast de éxito lo decide la RESPUESTA, no la intención: si la factura quedó
 * `Registrada` se dice que se generó la cuenta por pagar.
 */
export const useCreateSupplierInvoice = (
  onServerError?: (parsed: ParsedSupplierInvoiceError) => void,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSupplierInvoice,
    onSuccess: (factura) => {
      void invalidateSupplierInvoiceQueries(queryClient, factura);
      const etiqueta = factura.folio || `#${factura.id}`;
      toast.success(
        factura.estatus === "Registrada"
          ? `Factura ${etiqueta} registrada: se generó su cuenta por pagar`
          : `Borrador de factura ${etiqueta} guardado`,
      );
    },
    onError: (error) => {
      const parsed = parseSupplierInvoiceError(error, `${FALLBACK}.`);
      onServerError?.(parsed);
      toast.error(supplierInvoiceErrorToastMessage(parsed, FALLBACK));
    },
  });
};
