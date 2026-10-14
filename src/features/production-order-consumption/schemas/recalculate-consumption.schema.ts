import { z } from "zod";

/**
 * Formulario del recálculo de consumos. `cantidad_real_corte` se captura como
 * texto (mismo criterio que la ruta crítica: un `type="number"` reporta "" ante
 * texto que no parsea) y el schema lo convierte a entero.
 */

export const CANTIDAD_REAL_CORTE_MESSAGE =
  "Captura las piezas realmente cortadas: un número entero mayor que cero.";

export const PRODUCTOS_REQUIRED_MESSAGE = "Selecciona al menos un producto.";

const cantidadRealCorte = z
  .string()
  .trim()
  .refine(
    (raw) => /^\d+$/.test(raw) && Number(raw) > 0 && Number.isSafeInteger(Number(raw)),
    CANTIDAD_REAL_CORTE_MESSAGE,
  )
  .transform(Number);

const RecalculateConsumptionObject = z.object({
  cantidad_real_corte: cantidadRealCorte,
  productos: z.array(z.number().int().positive()).min(1, PRODUCTOS_REQUIRED_MESSAGE),
});

export const recalculateConsumptionSchema = RecalculateConsumptionObject;

/** Schema de un solo campo, para la validación en blur. */
export const RecalculateConsumptionFields = RecalculateConsumptionObject.shape;

/** Valores del formulario (antes de la conversión del schema). */
export type RecalculateConsumptionValues = z.input<typeof RecalculateConsumptionObject>;

export type RecalculateConsumptionField = keyof RecalculateConsumptionValues;

export const RECALCULATE_CONSUMPTION_FORM_FIELDS = Object.keys(
  RecalculateConsumptionFields,
) as RecalculateConsumptionField[];
