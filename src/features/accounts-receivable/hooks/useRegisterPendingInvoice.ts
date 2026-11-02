import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { registerPendingInvoice } from "../services/actions";
import {
  REGISTER_PENDING_INVOICE_FIELDS,
  type RegisterPendingInvoiceFormValues,
} from "../schemas/register-pending-invoice.schema";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { handleDrfWriteError } from "@/src/utils/drfWriteErrors";

/**
 * Campos del formulario que pueden recibir un error de campo del backend.
 * `empresa` y `sucursal` (que el `400` también puede devolver) NO son campos del
 * formulario —se resuelven en el servidor—, así que sus mensajes solo se
 * muestran vía toast, nunca se mapean a un campo.
 */
export type RegisterPendingInvoiceField = keyof RegisterPendingInvoiceFormValues;

type SetRegisterPendingInvoiceError = (
  field: RegisterPendingInvoiceField,
  message: string,
) => void;

/**
 * useRegisterPendingInvoice
 *
 * Mutación para `POST /finanzas/facturas/registrar-pendiente-cobro/`. Sigue la
 * convención del proyecto (ver `useCreateStockMovement`): la invalidación de la
 * lista y el toast viven aquí. Un `400` pasa por `handleDrfWriteError`: cada
 * llave que es campo del formulario (`REGISTER_PENDING_INVOICE_FIELDS`,
 * derivado del schema) se pinta bajo su campo con `setError` (el
 * `setServerFieldError` de `useFormFieldErrors`), y el toast lleva el mensaje
 * que no tiene campo (`empresa`, `sucursal`, `non_field_errors`, `detail`).
 */
export const useRegisterPendingInvoice = (
  setError?: SetRegisterPendingInvoiceError,
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerPendingInvoice,
    onSuccess: () => {
      // Refresca la lista real de CxC (`useCuentasPorCobrar` usa una llave con
      // prefijo `["accounts-receivable"]`, que esta invalidación cubre). Se crea
      // además una factura, así que también se invalida la lista de facturas
      // (sibling `invoicing`).
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void invalidatePedidoProgress(queryClient);
      toast.success("Factura pendiente por cobrar registrada correctamente");
    },
    onError: (error) => {
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data && typeof data === "object") {
          toast.error(
            handleDrfWriteError(
              error,
              "Error de validación al registrar la factura",
              REGISTER_PENDING_INVOICE_FIELDS,
              setError,
            ),
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
