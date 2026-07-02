import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import toast from "react-hot-toast";
import { createInvoiceFromOrder } from "../services/actions";
import type { CreateInvoiceFromOrderBody } from "../interfaces/invoice.interface";

/**
 * Error de creación de factura normalizado a partir de las dos formas que
 * devuelve el contrato:
 *  - `400` con `{ pedido: msg }` (el pedido ya tiene una factura activa).
 *    `msg` puede llegar como string plano o como array de strings (convención
 *    estándar de errores de campo de DRF); se maneja cualquiera de las dos
 *    formas.
 *  - `404` con `{ detail: msg }` (pedido inexistente o de otra empresa).
 * Ambas se notifican como toast.
 */
export interface CreateInvoiceError {
  message: string;
}

/**
 * Normaliza el error de Axios en las dos formas conocidas del contrato.
 * Cualquier otra cosa cae en un mensaje genérico.
 */
export const parseCreateInvoiceError = (error: unknown): CreateInvoiceError => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as
      | { pedido?: string | string[]; detail?: string }
      | undefined;

    if (status === 400 && data?.pedido) {
      const message = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido;
      if (message) return { message };
    }
    if (status === 404 && data?.detail) {
      return { message: data.detail };
    }
  }
  return { message: "No se pudo crear la factura. Intenta de nuevo." };
};

/**
 * useCreateInvoiceFromOrder
 *
 * Mutación para crear una factura vía `POST /finanzas/facturas/desde-pedido/`.
 * Sigue la convención del proyecto (ver `useCreateProductionOrder`): la
 * invalidación de la lista y el toast de éxito viven aquí. A diferencia de otros
 * hooks, el error **no** se colapsa en un toast genérico de este hook: se
 * expone {@link parseCreateInvoiceError} para que el hook de formulario
 * obtenga el mensaje específico del contrato antes de notificarlo vía toast.
 */
export const useCreateInvoiceFromOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateInvoiceFromOrderBody) =>
      createInvoiceFromOrder(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Factura creada correctamente");
    },
  });
};
