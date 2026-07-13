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
      .nonnegative("La cantidad no puede ser negativa"),
    // Observaciones: opcionales para TODO tipo de movimiento. En AJUSTE el
    // backend trunca a 150 caracteres — eso se avisa con un indicador suave en
    // la UI, no como error de validación (no bloqueamos el envío).
    observaciones: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Para movimientos que no son AJUSTE, la cantidad debe ser mayor a 0.
    if (data.tipo_movimiento !== "AJUSTE" && data.cantidad === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La cantidad debe ser mayor a 0",
        path: ["cantidad"],
      });
    }
  });

/**
 * Límite que el backend aplica a `observaciones` en movimientos de tipo AJUSTE
 * (trunca en el servidor). Se usa solo para un aviso suave en la UI.
 */
export const AJUSTE_OBSERVACIONES_MAX = 150;

export type StockMovementFormValues = z.infer<typeof StockMovementFormSchema>;
