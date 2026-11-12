import { z } from "zod";

/**
 * Rangos de los parámetros de cálculo del tablero, los mismos que valida el
 * backend (`TableroRotacionParamsSerializer`). Los usan tanto los codecs de la
 * URL (`rotationBoardTable`) como los campos numéricos de la pantalla, para que
 * un valor que el campo acepta nunca sea uno que el backend rechace.
 */
export const ROTATION_CONTROL_LIMITS = {
  semanas: { min: 1, max: 104, default: 12 },
  semanas_objetivo: { min: 1, max: 52, default: 8 },
  dias_sin_venta: { min: 1, max: 730, default: 90 },
} as const;

export type RotationNumericControl = keyof typeof ROTATION_CONTROL_LIMITS;

const boundedInt = (label: string, { min, max }: { min: number; max: number }) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}: escribe un número entero.`)
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(min, `${label}: mínimo ${min}.`)
        .max(max, `${label}: máximo ${max}.`),
    );

/** Lo que el usuario teclea en cada campo numérico → entero válido o mensaje. */
export const rotationControlSchemas: Record<RotationNumericControl, z.ZodType<number, string>> = {
  semanas: boundedInt("Semanas de análisis", ROTATION_CONTROL_LIMITS.semanas),
  semanas_objetivo: boundedInt("Semanas objetivo", ROTATION_CONTROL_LIMITS.semanas_objetivo),
  dias_sin_venta: boundedInt("Días sin venta", ROTATION_CONTROL_LIMITS.dias_sin_venta),
};

/**
 * Piezas a fabricar en el detalle de un SKU. Solo se exige un entero ≥ 1: el
 * TOPE (1 000 000) lo valida el backend y su mensaje por campo se muestra bajo
 * el campo.
 */
export const materialsCantidadSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "Escribe un número entero de piezas.")
  .transform(Number)
  .pipe(z.number().int().min(1, "Mínimo 1 pieza."));
