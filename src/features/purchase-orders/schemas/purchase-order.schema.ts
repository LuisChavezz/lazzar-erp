import { z } from "zod";

export const PurchaseOrderSchema = z.object({
  // Campos capturados por el usuario
  fecha_entrega_estimada: z
    .string()
    .min(1, "La fecha de entrega estimada es requerida"),
  observaciones: z.string().default(""),
});

export type PurchaseOrderFormValues = z.infer<typeof PurchaseOrderSchema>;
