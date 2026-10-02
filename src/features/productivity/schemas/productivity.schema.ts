import { z } from "zod";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";

/**
 * Decimal(10,2) del backend: no negativo, hasta 8 enteros y 2 decimales
 * (máximo 99999999.99). Vacío es válido: el campo es opcional y viaja como
 * `null`. El punto colgante de una captura a medias ("12.") se tolera.
 */
const DECIMAL_PATTERN = /^\d{1,8}(\.\d{1,2})?$/;

export const DECIMAL_RANGO_MESSAGE =
  "Debe ser un número no negativo de hasta 8 enteros y 2 decimales";

const optionalDecimal = z
  .string()
  .refine(
    (value) => value.trim() === "" || DECIMAL_PATTERN.test(stripTrailingDecimalPoint(value.trim())),
    DECIMAL_RANGO_MESSAGE
  );

/**
 * Campos capturables. `empresa` y `departamento` NO son campos del formulario:
 * se derivan del empleado (ver `useProductivityForm`), así que su regla
 * ("el empleado debe tener departamento") vive allí y se pinta bajo
 * `empleado`. `estado` tampoco: el alta siempre es borrador y la edición no lo
 * toca.
 *
 * `empleado` y `meta_unidad` usan 0 como centinela de "Seleccionar...".
 */
export const ProductivityFormSchema = z.object({
  empleado: z.number().int("El empleado es inválido").positive("El empleado es requerido"),
  fecha: z.string().min(1, "La fecha es requerida"),
  meta_unidad: z
    .number()
    .int("La unidad de medida es inválida")
    .positive("La unidad de medida es requerida"),
  meta: optionalDecimal,
  resultado: optionalDecimal,
  descripcion: z.string(),
});

/** Schema de un solo campo, para la validación en blur. */
export const ProductivityFormFields = ProductivityFormSchema.shape;

export type ProductivityFormValues = z.infer<typeof ProductivityFormSchema>;
