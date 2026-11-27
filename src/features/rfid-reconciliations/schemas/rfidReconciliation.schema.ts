import { z } from "zod";

/** Largo de `remision` y `factura_referencia` en el modelo (`CharField(max_length=50)`). */
export const RFID_RECONCILIATION_REFERENCE_MAX = 50;

/**
 * Datos del encuadre (paso 2 del alta). `seriesDisponibles` son las series de
 * recepción de la sucursal de la orden (`receiptSeriesOfrecidas`), igual que
 * en Nueva Recepción: la serie elegida tiene que ser una de ellas.
 */
export const buildRfidReconciliationFormSchema = (seriesDisponibles: readonly string[]) =>
  z.object({
    almacen: z.coerce.number().min(1, "El almacén es requerido"),
    serie_codigo: z
      .string()
      .refine((value) => value.length > 0, "La serie es requerida")
      .refine((value) => value === "" || seriesDisponibles.includes(value), "La serie no está en la sucursal de la orden"),
    remision: z
      .string()
      .trim()
      .max(RFID_RECONCILIATION_REFERENCE_MAX, `A lo más ${RFID_RECONCILIATION_REFERENCE_MAX} caracteres`),
    factura_referencia: z
      .string()
      .trim()
      .max(RFID_RECONCILIATION_REFERENCE_MAX, `A lo más ${RFID_RECONCILIATION_REFERENCE_MAX} caracteres`),
    observaciones: z.string().trim(),
  });

/** Lo que captura el formulario (`almacen` = 0 mientras no se elige). */
export interface RfidReconciliationFormValues {
  almacen: number;
  serie_codigo: string;
  remision: string;
  factura_referencia: string;
  observaciones: string;
}
export type RfidReconciliationFormField = keyof RfidReconciliationFormValues;
