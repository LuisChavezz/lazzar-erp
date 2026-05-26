/**
 * Schema para la especificación de bordado por ubicación.
 * Valida medidas opcionales, color y la URL de imagen (si existe).
 */
import { z } from "zod";
import { isCustomEmbroideryPosition } from "../constants/embroideryPositions";
import { imageUrlSchema } from "./image-url.schema";

export const embroiderySpecSchema = z
  .object({
    posicionCodigo: z.string().min(1, "Requerido"),
    posicionNombre: z.string().min(1, "Requerido"),
    posicionPersonalizada: z.string().max(160, "Máximo 160 caracteres").optional(),
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
    // Acepta URL de imagen válida o cadena vacía (productos precargados sin imagen asignada)
    imagen: z.union([imageUrlSchema, z.literal("")]),
    nuevoPonchado: z.boolean(),
    serigrafia: z.boolean(),
    sublimado: z.boolean(),
    dtf: z.boolean(),
    revelado: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      isCustomEmbroideryPosition(data.posicionCodigo) &&
      !data.posicionPersonalizada?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["posicionPersonalizada"],
        message: "Describe la ubicación personalizada",
      });
    }
  });