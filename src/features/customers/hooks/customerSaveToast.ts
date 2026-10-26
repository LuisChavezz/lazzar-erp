import toast from "react-hot-toast";
import { toastWarning } from "@/src/utils/toastWarning";
import type { Customer } from "../interfaces/customer.interface";
import { getFacturamaSaveWarning } from "../utils/facturamaVerification";

/**
 * Aviso del alta/edición de un cliente. Lee lo que devolvió el backend, no lo
 * capturado: él decide si quedó en Facturama. Si no quedó, el aviso sustituye
 * al de éxito.
 */
export const toastCustomerSaved = (
  customer: Pick<Customer, "facturama_verificado" | "facturama_faltantes">,
  successMessage: string
) => {
  const facturamaWarning = getFacturamaSaveWarning(customer);
  if (facturamaWarning) {
    toastWarning(facturamaWarning);
  } else {
    toast.success(successMessage);
  }
};
