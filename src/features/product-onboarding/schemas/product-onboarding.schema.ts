import { z } from "zod";

/**
 * Validación del FORMULARIO de alta rápida de producto. El armado del payload
 * (mayúsculas, recorte y decimal canónico) vive en `useProductOnboardingForm`.
 *
 * Los topes replican el contrato del backend para avisar antes del 400:
 *  - `nombre`: `CharField(max_length=100)`.
 *  - `precio_base`: `DecimalField(max_digits=10, decimal_places=2)` → hasta 8
 *    enteros y 2 decimales. Se captura como TEXTO (lo sanea
 *    `sanitizeDecimalInput`); el regex tolera el punto colgante de una captura
 *    a medio escribir ("12.") porque `toSendableDecimal` lo normaliza al enviar.
 *
 * `tipo` y `categoria_producto` usan `0` como "sin seleccionar" (los `<select>`
 * no tienen un `null` natural), por eso se exige un entero positivo.
 */
export const ProductOnboardingFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  tipo: z.number().int().positive("El tipo es requerido"),
  categoria_producto: z.number().int().positive("La categoría es requerida"),
  precio_base: z
    .string()
    .trim()
    .min(1, "El precio base es requerido")
    .regex(/^\d{1,8}(\.\d{0,2})?$/, "Precio inválido: máximo 8 enteros y 2 decimales")
    .refine((value) => Number(value) > 0, "El precio base debe ser mayor a cero"),
});

export type ProductOnboardingFormValues = z.infer<typeof ProductOnboardingFormSchema>;

export type ProductOnboardingFormField = keyof ProductOnboardingFormValues;

/** Valores iniciales del alta. */
export const createEmptyProductOnboardingForm = (): ProductOnboardingFormValues => ({
  nombre: "",
  tipo: 0,
  categoria_producto: 0,
  precio_base: "",
});
