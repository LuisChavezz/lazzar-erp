import { AxiosError } from "axios";
import { firstDrfMessage, firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { CustomerFormValues } from "../schemas/customer.schema";

export type SetCustomerError = (
  field: keyof CustomerFormValues,
  error: { type?: string; message?: string }
) => void;

/**
 * Claves de un 400 de `/terceros/clientes/` que no son de un campo del
 * formulario. `facturama`: Facturama rechazó el alta o la edición y, como el
 * backend lo hace en una transacción, no se guardó nada en el ERP.
 */
const CUSTOMER_REJECTION_KEYS = ["facturama"] as const;

/**
 * Reparte un 400 del alta/edición de cliente: cada error de campo va a
 * `setError` (llegue como string o como lista) y devuelve el mensaje que no es
 * de ningún campo, para el banner del formulario y el toast. `undefined` si no
 * hay tal mensaje (red, 5xx o solo errores de campo).
 */
export const handleCustomerWriteError = (
  error: unknown,
  setError?: SetCustomerError
): string | undefined => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) {
    return undefined;
  }
  const data = error.response.data;
  if (!data || typeof data !== "object") {
    return undefined;
  }

  if (setError) {
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if ((CUSTOMER_REJECTION_KEYS as readonly string[]).includes(key)) {
        return;
      }
      const message = firstDrfMessage(value);
      if (message) {
        setError(key as keyof CustomerFormValues, { type: "server", message });
      }
    });
  }

  return firstRejectionMessage(data, CUSTOMER_REJECTION_KEYS);
};
