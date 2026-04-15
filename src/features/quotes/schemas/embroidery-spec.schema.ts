/**
 * Schema para la especificación de bordado por ubicación.
 * Valida medidas opcionales, color y la URL de imagen (si existe).
 */
import { z } from "zod";
import { imageUrlSchema } from "./image-url.schema";

export const embroiderySpecSchema = z.object({
  posicionCodigo: z.string().min(1, "Requerido"),
  posicionNombre: z.string().min(1, "Requerido"),
  ancho: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo")
    .optional(),
  alto: z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo")
    .optional(),
  colorHilo: z.string().optional(),
  pantones: z.string().optional(),
  imagen: imageUrlSchema,
  nuevoPonchado: z.boolean(),
  serigrafia: z.boolean(),
  sublimado: z.boolean(),
  dtf: z.boolean(),
  revelado: z.boolean(),
});