import { z } from "zod";
import { stripTrailingDecimalPoint } from "@/src/utils/decimal";

/**
 * Validación del alta de SKU de producción + lista de materiales de una línea
 * de muestra (`POST /produccion/pedidos-especiales/{id}/variante-onboarding/`).
 *
 * Los RANGOS se validan aquí porque el backend no lo hace: `cantidad` y
 * `desperdicio` son `DecimalField` sin `min_value`/`max_value`, así que un 0,
 * un negativo o un 150 % se guardarían tal cual. Los topes superiores son los
 * de la columna (`max_digits`), que sí rechaza con un 400.
 *
 * Los decimales se capturan como TEXTO (no `number`) y se envían como string
 * canónico de 2 posiciones, igual que el resto de decimales del proyecto.
 */

/** Entero o decimal con 1–2 posiciones. Sin signo: no admite negativos. */
const DECIMAL_2_PLACES = /^\d+(\.\d{1,2})?$/;

/** `cantidad` es `DecimalField(max_digits=12, decimal_places=2)`. */
const MAX_CANTIDAD = 9_999_999_999.99;

const DECIMAL_FORMAT_MESSAGE = "Usa un número con máximo 2 decimales";

/**
 * Quita espacios y el punto colgante de una captura a medias (`"12."`), y
 * antepone el cero a un decimal sin parte entera (`".5"` → `"0.5"`): es una
 * forma normal de escribir medio metro, y `sanitizeDecimalInput` la deja pasar.
 */
const normalizeDecimal = (value: string): string => {
  const trimmed = value.trim();
  return stripTrailingDecimalPoint(trimmed.startsWith(".") ? `0${trimmed}` : trimmed);
};

const cantidadSchema = z
  .string()
  .transform(normalizeDecimal)
  .pipe(
    z
      .string()
      .min(1, "La cantidad es requerida")
      .regex(DECIMAL_2_PLACES, DECIMAL_FORMAT_MESSAGE)
      .refine((value) => Number(value) > 0, "La cantidad debe ser mayor a 0")
      .refine((value) => Number(value) <= MAX_CANTIDAD, "La cantidad es demasiado grande"),
  )
  .transform((value) => Number(value).toFixed(2));

/** Vacío equivale a 0: es el default del backend y el campo es opcional. */
const desperdicioSchema = z
  .string()
  .transform((value) => normalizeDecimal(value) || "0")
  .pipe(
    z
      .string()
      .regex(DECIMAL_2_PLACES, DECIMAL_FORMAT_MESSAGE)
      .refine((value) => Number(value) <= 100, "El desperdicio debe estar entre 0 y 100"),
  )
  .transform((value) => Number(value).toFixed(2));

/**
 * Renglón de material. `unidad` usa `0` como centinela de "sin seleccionar"
 * (mismo criterio que `bom.schema.ts`).
 */
export const SampleSkuOnboardingMaterialSchema = z.object({
  componente: z.number().int().positive("El material es requerido"),
  cantidad: cantidadSchema,
  unidad: z.number().int().positive("La unidad es requerida"),
  desperdicio: desperdicioSchema,
  obligatorio: z.boolean(),
});

/**
 * `color` solo es obligatorio cuando la línea no tiene color (`requiresColor`);
 * si ya lo tiene, el valor del formulario se ignora y no viaja en el cuerpo.
 * `0` es el centinela de "sin seleccionar".
 */
export const buildSampleSkuOnboardingSchema = (requiresColor: boolean) =>
  z.object({
    color: requiresColor
      ? z.number().int().positive("Selecciona el color de la línea")
      : z.number(),
    materia_prima_detalle: z
      .array(SampleSkuOnboardingMaterialSchema)
      .min(1, "Selecciona al menos un material"),
  });

type SampleSkuOnboardingSchema = ReturnType<typeof buildSampleSkuOnboardingSchema>;

/** Valores tal como los captura el formulario (decimales en texto). */
export type SampleSkuOnboardingFormValues = z.input<SampleSkuOnboardingSchema>;
export type SampleSkuOnboardingMaterialFormValues =
  SampleSkuOnboardingFormValues["materia_prima_detalle"][number];
