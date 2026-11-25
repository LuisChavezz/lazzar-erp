import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { deleteSupplierInvoice } from "../services/actions";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { parseSupplierInvoiceError, supplierInvoiceErrorToastMessage } from "../utils/parseSupplierInvoiceError";
import { invalidateSupplierInvoiceQueries } from "./invalidateSupplierInvoiceQueries";

const FALLBACK = "Error al eliminar la factura de proveedor";

/** Llave del borrado: la lista lee de ella las facturas en vuelo (la variable es la factura). */
export const deleteSupplierInvoiceMutationKey = ["delete-supplier-invoice"] as const;

/**
 * Elimina un BORRADOR de factura de proveedor
 * (`DELETE /finanzas/facturas-proveedor/{id}/`, nucleo-erp#1356, EC-950): solo
 * en `Borrador`; otro estatus responde `400 estatus` ("usa POST cancelar/"),
 * que se muestra tal cual. No es optimista: al terminar, con cualquier
 * resultado, relee los listados (la fila sale, o vuelve con su estatus real).
 */
export const useDeleteSupplierInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: deleteSupplierInvoiceMutationKey,
    mutationFn: (factura: Pick<FacturaProveedor, "id" | "folio" | "oc">) => deleteSupplierInvoice(factura.id),
    onSuccess: (_data, factura) => {
      toast.success(`Borrador ${factura.folio || `#${factura.id}`} eliminado`);
    },
    onError: (error) => {
      toast.error(supplierInvoiceErrorToastMessage(parseSupplierInvoiceError(error, `${FALLBACK}.`), FALLBACK));
    },
    // La promesa del refetch: la confirmación se cierra sobre datos frescos.
    onSettled: (_data, _error, factura) =>
      invalidateSupplierInvoiceQueries(queryClient, { estatus: "Borrador", oc: factura.oc }),
  });
};
