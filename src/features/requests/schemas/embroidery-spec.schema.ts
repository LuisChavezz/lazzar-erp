/**
 * Schema para la especificación de bordado por ubicación.
 * Valida medidas condicionales, color y la URL de imagen (si existe).
 *
 * CLON de `quotes/schemas/embroidery-spec.schema.ts`.
 *
 * `isCustomEmbroideryPosition` NO se clona: es el catálogo de posiciones de
 * bordado, un dato de negocio compartido. Duplicarlo abriría deriva entre dos
 * listas de posiciones que deben ser la misma.
 */
import { z } from "zod";
import { isCustomEmbroideryPosition } from "../../quotes/constants/embroideryPositions";
import { imageUrlSchema } from "./image-url.schema";

// Esquema para medidas que pueden ser opcionales pero deben ser números positivos si se proporcionan
const optionalMeasurementSchema = z.preprocess(
  (value) => {
    if (value == null) {
      return undefined;
    }

    if (typeof value === "string" && !value.trim()) {
      return undefined;
    }

    return value;
  },
  z
    .coerce.number({
      message: "Debe ser un número válido",
    })
    .gt(0, "Debe ser positivo")
    .optional()
);

export const embroiderySpecSchema = z
  .object({
    posicionCodigo: z.string().min(1, "Requerido"),
    posicionNombre: z.string().min(1, "Requerido"),
    posicionPersonalizada: z.string().max(160, "Máximo 160 caracteres").optional(),
    ancho: optionalMeasurementSchema,
    alto: optionalMeasurementSchema,
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
    if (data.nuevoPonchado) {
      if (data.ancho == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["ancho"],
          message: "Requerido",
        });
      }

      if (data.alto == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["alto"],
          message: "Requerido",
        });
      }
    }

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
