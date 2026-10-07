import { z } from "zod";

/**
 * Validación de la respuesta de `GET /finanzas/facturas/onboarding/?pedido=`.
 * Los importes llegan como string decimal y las piezas como enteros; el
 * servicio valida con este schema antes de normalizar, para que un cambio de
 * contrato falle como error de carga visible y no como `NaN` en pantalla.
 */
const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, "Decimal inválido");

const invoiceOnboardingTallaSchema = z.object({
  pedido_detalle_talla: z.number().int(),
  pedido_detalle: z.number().int(),
  producto: z.number().int().nullable(),
  producto_nombre: z.string().nullable(),
  talla: z.number().int(),
  talla_nombre: z.string(),
  precio_unitario: decimalString,
  cantidad_pedida: z.number(),
  cantidad_facturada: z.number(),
  cantidad_pendiente: z.number(),
});

export const invoiceOnboardingResponseSchema = z.object({
  pedido: z.number().int(),
  pedido_folio: z.string().nullable(),
  porcentaje_impuesto: decimalString,
  total_piezas_pedidas: z.number(),
  total_piezas_facturadas: z.number(),
  total_piezas_pendientes: z.number(),
  tallas: z.array(invoiceOnboardingTallaSchema),
});

/**
 * Cuerpo del POST. Mismas reglas de forma que el backend (piezas ENTERAS > 0,
 * al menos una línea, tallas sin repetir); el techo "≤ pendiente" lo aplica el
 * input y, de forma autoritativa, el servidor.
 */
export const invoiceOnboardingPayloadSchema = z.object({
  pedido: z.number().int().positive("Selecciona un pedido"),
  factura_detalles: z
    .array(
      z.object({
        pedido_detalle_talla: z.number().int().positive(),
        cantidad: z
          .number()
          .int("La cantidad debe ser un número entero de piezas")
          .positive("La cantidad debe ser mayor a 0"),
      }),
    )
    .min(1, "Captura al menos una pieza a facturar")
    .refine(
      (lineas) =>
        new Set(lineas.map((l) => l.pedido_detalle_talla)).size === lineas.length,
      "Una talla no puede repetirse en la misma factura",
    ),
});
