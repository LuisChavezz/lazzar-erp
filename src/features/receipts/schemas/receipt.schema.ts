import { z } from "zod";

export const CANTIDADES_REQUIRED_MESSAGE =
  "Captura al menos una cantidad recibida mayor a 0";

export const ReceiptFormSchema = z.object({
  almacen: z.coerce.number().min(1, "El almacén es requerido"),
  serie_codigo: z.string().min(1, "La serie de recepción es requerida"),
  remision: z.string().optional().default(""),
  factura_referencia: z.string().optional().default(""),
  observaciones: z.string().optional().default(""),
  // El submit solo envía los renglones con cantidad > 0 (`reduceDetalle`): sin
  // ninguno el POST saldría con `detalle: []`, que el backend rechaza (EC-894).
  // También cubre una orden sin renglones, cuyo registro queda vacío (EC-893).
  cantidades: z.record(z.string(), z.string()).superRefine((cantidades, ctx) => {
    const algunaPositiva = Object.values(cantidades).some(
      (cantidad) => cantidad.trim() !== "" && Number(cantidad) > 0,
    );
    if (!algunaPositiva) {
      ctx.addIssue({ code: "custom", message: CANTIDADES_REQUIRED_MESSAGE });
    }
  }),
});

export type ReceiptFormValues = z.infer<typeof ReceiptFormSchema>;
