import { z } from "zod";

/**
 * Forma mínima de `PurchaseOrderDetail` que consume el render del correo de
 * orden de compra (`PurchaseOrderEmail` + `buildPurchaseOrderEmailContent`).
 *
 * Valida el payload recibido en el POST de
 * `/api/purchase-orders/[orderId]/send-email` antes de renderizar — evita que
 * un payload incompleto o malformado (p. ej. `detalles` ausente) provoque un
 * error sin control durante el render en vez de una respuesta 400 clara.
 *
 * ── Qué NO puede exigirse ────────────────────────────────────────────────────
 * Los campos de importe van `.optional()` porque el backend ELIMINA su clave de
 * la respuesta —no la manda en `null`— cuando el usuario no tiene un rol con
 * visibilidad financiera. El payload de este endpoint es esa misma respuesta
 * reenviada tal cual desde el cliente, así que exigirlos convertía una
 * limitación de permisos en un 400 opaco ("El payload de la orden es inválido o
 * está incompleto") que impedía enviar el correo por completo. La plantilla ya
 * sabe omitir la sección de importes cuando faltan.
 *
 * `folio` va `.nullable()` por el mismo criterio de realidad: el backend lo
 * asigna al confirmar, así que una orden puede llegar aquí sin él.
 */
const purchaseOrderEmailDetalleSchema = z.object({
  // `OrdenCompraDetalle.descripcion` es `null=True, blank=True` en el backend:
  // un renglón capturado sin descripción llegaría `null` y un `z.string()`
  // requerido reventaría el `safeParse`, devolviendo el 400 opaco que este
  // schema existe para evitar. La plantilla lo pinta con respaldo.
  descripcion: z.string().nullable(),
  cantidad: z.number(),
  precio: z.string().optional(),
  importe: z.string().optional(),
});

export const purchaseOrderEmailPayloadSchema = z.object({
  id: z.number(),
  folio: z.string().nullable(),
  referencia: z.string().nullable(),
  fecha_oc: z.string(),
  fecha_entrega_estimada: z.string().nullable(),
  // `OrdenCompra.proveedor` es `SET_NULL, null=True`; `get_proveedor_nombre`
  // devuelve `None` cuando no hay proveedor. Ambos nullable para no rechazar
  // una orden sin proveedor asignado.
  proveedor: z.number().nullable(),
  proveedor_nombre: z.string().nullable(),
  proveedor_correo: z.string().nullable(),
  observaciones: z.string().nullable(),
  detalles: z.array(purchaseOrderEmailDetalleSchema),
  total_piezas: z.number(),
  /**
   * Código ISO de la moneda. IMPRESCINDIBLE aquí aunque no se pinte como campo:
   * `z.object()` DESCARTA las claves que no declara, así que sin esta línea
   * `order.moneda_codigo` llegaba `undefined` a la plantilla y
   * `Intl.NumberFormat` —con `style: "currency"` y `currency: undefined`—
   * lanzaba, cayendo al respaldo que formatea el número SIN símbolo de moneda.
   * El correo salía con importes como "1,800" en vez de "$1,800.00".
   */
  moneda_codigo: z.string(),
  // ── Importes: pueden faltar por rol, ver el bloque del docstring ───────────
  subtotal: z.string().optional(),
  descuento: z.string().optional(),
  flete: z.string().optional(),
  seguros: z.string().optional(),
  porcentaje_iva: z.string().optional(),
  total_iva: z.string().optional(),
  gran_total: z.string().optional(),
});
