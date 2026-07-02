"use client";

import type { FormEvent } from "react";
import { useForm } from "@tanstack/react-form";
import toast from "react-hot-toast";
import {
  CreateInvoiceFromOrderSchema,
  type CreateInvoiceFromOrderValues,
} from "../schemas/create-invoice-from-order.schema";
import {
  useCreateInvoiceFromOrder,
  parseCreateInvoiceError,
} from "./useCreateInvoiceFromOrder";

interface UseCreateInvoiceFormParams {
  /** Se invoca tras crear la factura correctamente (cierra el diálogo). */
  onSuccess: () => void;
}

/**
 * useCreateInvoiceForm
 *
 * Encapsula la lógica de TanStack Form para crear una factura desde un pedido.
 * Sigue la convención del proyecto (ver `useCreateProductionOrderForm`):
 * `useForm` con `defaultValues` y validación Zod manual vía `safeParse` en el
 * submit.
 *
 * El único campo es `pedido` (parte en `0` = sin selección). Todo error de
 * envío —validación cliente, `400` "ya facturado" o `404` de detalle— se
 * normaliza con {@link parseCreateInvoiceError} y se notifica vía toast; el
 * diálogo nunca renderiza texto de error en línea.
 */
export function useCreateInvoiceForm({ onSuccess }: UseCreateInvoiceFormParams) {
  const { mutateAsync: createInvoice, isPending } = useCreateInvoiceFromOrder();

  const form = useForm({
    defaultValues: {
      pedido: 0,
    } as CreateInvoiceFromOrderValues,
    onSubmit: async ({ value }) => {
      const parsed = CreateInvoiceFromOrderSchema.safeParse(value);

      if (!parsed.success) {
        toast.error(
          parsed.error.issues[0]?.message ?? "Selecciona un pedido",
        );
        return;
      }

      try {
        await createInvoice(parsed.data);
        onSuccess();
      } catch (error) {
        toast.error(parseCreateInvoiceError(error).message);
      }
    },
  });

  // Delega el submit del <form> en TanStack Form.
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void form.handleSubmit();
  };

  return {
    form,
    isSubmitting: isPending,
    handleFormSubmit,
  };
}
