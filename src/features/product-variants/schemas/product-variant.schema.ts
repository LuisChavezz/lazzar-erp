import { z } from "zod";

export const ProductVariantFormSchema = z.object({
  producto: z.coerce.number().min(1, "El producto es requerido"),
  color: z.coerce.number().min(1, "El color es requerido"),
  /**
   * `0` = sin talla. Aquí NO se exige: solo es obligatoria si el producto elegido
   * es PT, y eso depende del producto, no de este valor. La regla condicional
   * vive en `useProductVariantForm` (`validateTalla`).
   */
  talla: z.coerce.number().int().min(0),
  sku: z.string().min(1, "El SKU es requerido"),
  precio_base: z
    .string()
    .min(1, "El precio base es requerido")
    .regex(
      /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,
      "Debe ser un número válido con máximo 2 decimales"
    )
    .refine((val) => Number(val) >= 0.01, {
      message: "El precio base debe ser mayor o igual a 0.01",
    }),
  activo: z.boolean(),
});

export type ProductVariantFormValues = z.infer<typeof ProductVariantFormSchema>;
