import { z } from "zod";

export const ReceiptFormSchema = z.object({
  remision: z.string().min(1, "La remisión es requerida"),
  factura_referencia: z.string().min(1, "La factura de referencia es requerida"),
  transportista: z.string().min(1, "El transportista es requerido"),
  proveedor: z.coerce.number().min(1, "El proveedor es requerido"),
  almacen: z.coerce.number().min(1, "El almacén es requerido"),
  observaciones: z.string().optional().default(""),
});

export type ReceiptFormValues = z.infer<typeof ReceiptFormSchema>;
