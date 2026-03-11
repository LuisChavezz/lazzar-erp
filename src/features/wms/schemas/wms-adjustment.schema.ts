import { z } from "zod";

export const WmsAdjustmentReasonSchema = z.enum([
  "Conteo físico",
  "Merma",
  "Error sistema",
  "Producto dañado",
]);

export const WmsAdjustmentSchema = z.object({
  producto: z.string().min(1, "Requerido"),
  ubicacion: z.string().min(1, "Requerido"),
  cantidadActual: z.number().min(0, "Requerido"),
  cantidadCorrecta: z.coerce.number().min(0, "Requerido"),
  motivo: WmsAdjustmentReasonSchema,
});

export type WmsAdjustmentFormValues = z.infer<typeof WmsAdjustmentSchema>;
