/**
 * Schema para un item de la cotización (producto):
 * - valida cantidades, precio y posibles servicios asociados (bordado, reflejante)
 * - incluye refinamientos para validar ubicaciones duplicadas en bordados
 */
import { z } from "zod";
import { embroiderySchema } from "./embroidery.schema";
import { quoteItemSizeSchema } from "./quote-item-size.schema";
import { reflectiveSchema } from "./reflective.schema";

export const quoteItemSchema = z
  .object({
    productoId: z.coerce.number().min(1, "Requerido"),
    descripcion: z.string().min(1, "Requerido"),
    unidad: z.string().min(1, "Requerido"),
    cantidad: z
      .coerce.number({
        message: "Debe ser un número válido",
      })
      .int("Debe ser un número entero")
      .min(1, "Debe ser mayor o igual a 1"),
    precio: z.coerce.number().gt(0, "Debe ser positivo"),
    descuento: z
      .coerce.number({
        message: "Debe ser un número válido",
      })
      .int("Debe ser un número entero")
      .min(0, "No puede ser menor a 0")
      .max(100, "No puede ser mayor a 100"),
    importe: z.coerce.number().min(0, "No puede ser negativo"),
    tallas: z.array(quoteItemSizeSchema).optional(),
    bordados: embroiderySchema.optional(),
    reflejantes: reflectiveSchema.optional(),
    lleva_corte_manga: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.bordados?.activo) return;
    if (!data.bordados.especificaciones || data.bordados.especificaciones.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bordados", "especificaciones"],
        message: "Agrega al menos una especificación",
      });
    }
    const used = new Set<string>();
    data.bordados.especificaciones.forEach((spec, index) => {
      if (used.has(spec.posicionCodigo)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bordados", "especificaciones", index, "posicionCodigo"],
          message: "La ubicación ya fue seleccionada",
        });
      }
      used.add(spec.posicionCodigo);
    });
  });
