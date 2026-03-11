import { z } from "zod";

export const WmsOutputItemSchema = z.object({
  stockId: z.number().min(1, "Requerido"),
  productoNombre: z.string().min(1, "Requerido"),
  almacenNombre: z.string().min(1, "Requerido"),
  ubicacionNombre: z.string().min(1, "Requerido"),
  cantidad: z.number().min(1, "Requerido"),
});

export const WmsOutputSchema = z.object({
  tipoMovimiento: z.enum(["Compra", "Transferencia", "Devolución", "Ajuste"]),
  fecha: z.string().min(1, "Requerido"),
  referencia: z.string().min(1, "Requerido"),
  destino: z.string().min(1, "Requerido"),
  usuario: z.string().min(1, "Requerido"),
  items: z.array(WmsOutputItemSchema).min(1, "Agrega al menos un producto"),
});

export type WmsOutputFormValues = z.infer<typeof WmsOutputSchema>;
