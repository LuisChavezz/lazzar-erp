import { z } from "zod";

/**
 * Forma mínima de `PurchaseOrderDetail` que consume el render del correo de
 * orden de compra (`PurchaseOrderEmail` + `buildPurchaseOrderEmailContent`).
 *
 * Valida el payload recibido en el POST de
 * `/api/purchase-orders/[orderId]/send-email` antes de renderizar — evita que
 * un payload incompleto o malformado (p. ej. `detalles` ausente) provoque un
 * error sin control durante el render en vez de una respuesta 400 clara.
 */
const purchaseOrderEmailDetalleSchema = z.object({
  descripcion: z.string(),
  cantidad: z.number(),
  precio: z.string(),
  importe: z.string(),
});

export const purchaseOrderEmailPayloadSchema = z.object({
  id: z.number(),
  folio: z.string(),
  referencia: z.string().nullable(),
  fecha_oc: z.string(),
  fecha_entrega_estimada: z.string().nullable(),
  proveedor: z.number(),
  proveedor_nombre: z.string(),
  proveedor_correo: z.string().nullable(),
  observaciones: z.string().nullable(),
  detalles: z.array(purchaseOrderEmailDetalleSchema),
  total_piezas: z.number(),
  subtotal: z.string(),
  descuento: z.string(),
  flete: z.string(),
  seguros: z.string(),
  porcentaje_iva: z.string(),
  total_iva: z.string(),
  gran_total: z.string(),
});
