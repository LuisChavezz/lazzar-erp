/**
 * Schema para la talla de un item de solicitud (talla + cantidad).
 *
 * CLON de `quotes/schemas/quote-item-size.schema.ts`.
 */
import { z } from "zod";

export const requestItemSizeSchema = z.object({
  tallaId: z.coerce.number().int().min(1, "Requerido"),
  nombre: z.string().min(1, "Requerido"),
  cantidad: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .int("Debe ser un número entero")
    .min(1, "Debe ser mayor o igual a 1"),
});
