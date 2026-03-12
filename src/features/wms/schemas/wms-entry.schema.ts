import { z } from "zod";

export const WmsEntryItemSchema = z.object({
  productoId: z.number().min(1, "Requerido"),
  productoNombre: z.string().min(1, "Requerido"),
  cantidad: z.number().min(1, "Requerido"),
});

export const WmsEntrySchema = z.object({
  tipoMovimiento: z.enum(["Compra", "Transferencia", "Devolución", "Ajuste"]),
  fecha: z.string().min(1, "Requerido"),
  referencia: z.string().min(1, "Requerido"),
  proveedor: z.string().min(1, "Requerido"),
  usuario: z.string().min(1, "Requerido"),
  items: z.array(WmsEntryItemSchema).min(1, "Agrega al menos un producto"),
});

export type WmsEntryFormValues = z.infer<typeof WmsEntrySchema>;
