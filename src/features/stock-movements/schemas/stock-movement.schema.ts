import { z } from "zod";

export const MOVEMENT_TYPES = ["ENTRADA", "SALIDA", "AJUSTE"] as const;

export const StockMovementFormSchema = z
  .object({
    tipo_movimiento: z.enum(MOVEMENT_TYPES, {
      message: "El tipo de movimiento es requerido",
    }),
    almacen_origen_id: z.number().min(1, "El almacén de origen es requerido"),
    ubicacion_origen_id: z.number().min(1, "La ubicación de origen es requerida"),
    producto_variante_id: z.number().min(1, "La variante de producto es requerida"),
    cantidad: z
      .number({ message: "La cantidad es requerida" })
      .int("La cantidad debe ser un número entero")
      .positive("La cantidad debe ser mayor a 0"),
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.tipo_movimiento === "AJUSTE") {
      if (!data.observaciones || data.observaciones.trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Las observaciones son requeridas para ajustes",
          path: ["observaciones"],
        });
      }
    }
  });

export type StockMovementFormValues = z.infer<typeof StockMovementFormSchema>;
