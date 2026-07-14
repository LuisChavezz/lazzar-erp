import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { registerPendingInvoice } from "../services/actions";
import {
  REGISTER_PENDING_INVOICE_FIELDS,
  type RegisterPendingInvoiceFormValues,
} from "../schemas/register-pending-invoice.schema";

/**
 * Campos del formulario que pueden recibir un error de campo del backend.
 * `empresa` y `sucursal` (que el `400` también puede devolver) NO son campos del
 * formulario —se resuelven en el servidor—, así que sus mensajes solo se
 * muestran vía toast, nunca se mapean a un campo.
 */
export type RegisterPendingInvoiceField = keyof RegisterPendingInvoiceFormValues;

// Derivado del esquema (ver `REGISTER_PENDING_INVOICE_FIELDS`): agregar/quitar un
// campo en el schema actualiza este set sin tocar aquí, evitando que la lista se
// desincronice del formulario.
const FORM_FIELDS: ReadonlySet<string> = new Set(REGISTER_PENDING_INVOICE_FIELDS);

type SetRegisterPendingInvoiceError = (
  field: RegisterPendingInvoiceField,
  error: { type?: string; message?: string },
) => void;

/**
 * useRegisterPendingInvoice
 *
 * Mutación para `POST /finanzas/facturas/registrar-pendiente-cobro/`. Sigue la
 * convención del proyecto (ver `useCreateStockMovement`): la invalidación de la
 * lista y el toast viven aquí, y los errores de campo del `400` se mapean al
 * formulario vía el callback `setError`. Los mensajes de llaves que no son
 * campos (`empresa`, `sucursal`) solo alimentan el toast agregado.
 */
export const useRegisterPendingInvoice = (
  setError?: SetRegisterPendingInvoiceError,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerPendingInvoice,
    onSuccess: () => {
      // La lista de CxC aún consume datos mock, pero se invalida su llave para
      // que quede lista cuando se conecte al endpoint real. Se crea además una
      // factura, así que también se invalida la lista de facturas (sibling
      // `invoicing`).
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura pendiente por cobrar registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data && typeof data === "object") {
          const messages: string[] = [];

          Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
            // El API puede devolver el mensaje como string plano o como array
            // de strings (convención de errores de campo de DRF).
            const message = Array.isArray(value) ? value[0] : value;
            if (typeof message !== "string" || message.length === 0) return;

            // Mapear al campo del formulario si corresponde; `empresa`/`sucursal`
            // no son campos y solo van al toast.
            if (setError && FORM_FIELDS.has(key)) {
              setError(key as RegisterPendingInvoiceField, {
                type: "server",
                message,
              });
            }

            messages.push(message);
          });

          toast.error(
            messages.length > 0
              ? messages.join("\n")
              : "Error de validación al registrar la factura",
          );
          return;
        }

        toast.error(
          (error.response?.data as { detail?: string })?.detail ??
            "No se pudo registrar la factura. Intenta de nuevo.",
        );
        return;
      }

      toast.error("No se pudo registrar la factura. Intenta de nuevo.");
    },
  });
};
