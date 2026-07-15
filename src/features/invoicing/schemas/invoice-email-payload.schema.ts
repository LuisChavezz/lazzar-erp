import { z } from "zod";

/**
 * Forma mínima de `Invoice` que consume el render del correo de factura
 * (`InvoiceEmail` + `buildInvoiceDocumentModel` + `buildInvoiceEmailContent`).
 *
 * Valida el payload recibido en el POST de
 * `/api/invoices/[invoiceId]/send-email` antes de renderizar — evita que un
 * payload malformado provoque un error sin control durante el render en vez de
 * una respuesta 400 clara.
 */
const invoiceEmailDetalleSchema = z.object({
  producto_nombre: z.string(),
  cantidad: z.string(),
  precio_unitario: z.string(),
  descuento: z.string(),
  total: z.string(),
});

export const invoiceEmailPayloadSchema = z.object({
  id: z.number(),
  folio: z.string(),
  cliente_nombre: z.string(),
  moneda_nombre: z.string(),
  estatus: z.string(),
  fecha_emision: z.string(),
  fecha_vencimiento: z.string(),
  subtotal: z.string(),
  descuento: z.string(),
  impuestos: z.string(),
  total: z.string(),
  observaciones: z.string().nullable(),
  /**
   * El listado puede no hidratar los conceptos, así que se acepta ausente/`null`
   * y se normaliza a `[]` — mismo criterio defensivo que `?? []` en
   * `buildInvoiceDocumentModel` e `InvoiceDetails`. Es deliberado que NO sea
   * requerido: con esa forma, una factura sin conceptos hidratados degradaría
   * en la descarga del PDF (que renderiza la sección vacía) pero fallaría con
   * un 400 permanente en el envío. Ambas rutas consumen el mismo modelo, así
   * que degradan igual: el correo muestra "Esta factura no tiene conceptos
   * registrados" (ver `InvoiceEmail`) y el PDF adjunto, su equivalente.
   */
  factura_detalles: z
    .array(invoiceEmailDetalleSchema)
    .nullish()
    .transform((detalles) => detalles ?? []),
});
