import { z } from "zod";

/**
 * Validación del FORMULARIO de alta rápida de variante. El armado del payload
 * (talla condicional y decimal canónico) vive en
 * `useProductVariantOnboardingForm`.
 *
 * `producto`, `color` y `talla` usan `0` como "sin seleccionar". La talla NO se
 * exige aquí: solo es obligatoria para productos PT, y eso depende del producto
 * elegido, no de este valor (ver `productRequiresTalla`).
 *
 * `precio_base` replica `DecimalField(max_digits=10, decimal_places=2)`: hasta
 * 8 enteros y 2 decimales, capturado como TEXTO (`sanitizeDecimalInput`); el
 * punto colgante de una captura a medio escribir lo normaliza
 * `toSendableDecimal` al enviar.
 */
export const ProductVariantOnboardingFormSchema = z.object({
  producto: z.number().int().positive("El producto es requerido"),
  color: z.number().int().positive("El color es requerido"),
  talla: z.number().int().min(0),
  precio_base: z
    .string()
    .trim()
    .min(1, "El precio base es requerido")
    .regex(/^\d{1,8}(\.\d{0,2})?$/, "Precio inválido: máximo 8 enteros y 2 decimales")
    .refine((value) => Number(value) > 0, "El precio base debe ser mayor a cero"),
});

export type ProductVariantOnboardingFormValues = z.infer<typeof ProductVariantOnboardingFormSchema>;

export type ProductVariantOnboardingFormField = keyof ProductVariantOnboardingFormValues;

/** Valores iniciales del alta. */
export const createEmptyProductVariantOnboardingForm = (): ProductVariantOnboardingFormValues => ({
  producto: 0,
  color: 0,
  talla: 0,
  precio_base: "",
});
