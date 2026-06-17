import { z } from "zod";

export const ReceiptFormSchema = z.object({
  almacen: z.coerce.number().min(1, "El almacén es requerido"),
  serie_codigo: z.string().min(1, "La serie de recepción es requerida"),
  remision: z.string().optional().default(""),
  factura_referencia: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
  cantidades: z.record(z.string(), z.string()),
});

export type ReceiptFormValues = z.infer<typeof ReceiptFormSchema>;
