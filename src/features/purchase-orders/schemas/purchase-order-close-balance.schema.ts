import { z } from "zod";

/**
 * Formulario del diálogo "Cerrar saldo" de una OC parcialmente recibida
 * (EC-947). El motivo es OBLIGATORIO (el backend responde 400 si llega en
 * blanco y guarda a lo más 500 caracteres): se recorta antes de validar.
 */
export const PURCHASE_ORDER_CLOSE_BALANCE_MOTIVO_MAX = 500;

export const ClosePurchaseOrderBalanceFormSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, "Indica por qué se cierra el saldo.")
    .max(
      PURCHASE_ORDER_CLOSE_BALANCE_MOTIVO_MAX,
      `El motivo admite a lo más ${PURCHASE_ORDER_CLOSE_BALANCE_MOTIVO_MAX} caracteres.`,
    ),
});

export type ClosePurchaseOrderBalanceFormValues = z.infer<typeof ClosePurchaseOrderBalanceFormSchema>;
