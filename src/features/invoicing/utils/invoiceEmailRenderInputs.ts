import type { Invoice } from "../interfaces/invoice.interface";
import { buildInvoiceDocumentModel } from "./invoiceDocumentModel";

/**
 * Lo que se RENDERIZA del correo de una factura y de su PDF adjunto, para que
 * el envío compare la versión confirmada con la recién leída
 * (`assertEmailSnapshotUnchanged`) sin abortar por cambios que no se ven:
 * pagos, auditoría…
 *
 * - `document`: `InvoiceEmail` y su asunto (`buildInvoiceEmailSubject`) se
 *   construyen de este modelo.
 * - `pdf`: lo que el PDF adjunto (`InvoicePdfDocument`, EC-859) lee aparte del
 *   modelo: receptor fiscal, forma de pago, tipo de cambio y el CFDI. Desde
 *   EC-859 el PDF imprime el folio fiscal, así que timbrar entre preparar y
 *   confirmar SÍ aborta.
 * - `correo`: el destinatario (`to` del Route Handler) y el pie del correo.
 */
export const invoiceEmailRenderInputs = (invoice: Invoice) => ({
  document: buildInvoiceDocumentModel(invoice),
  pdf: {
    activo: invoice.activo,
    tipo_cambio: invoice.tipo_cambio,
    receptor: invoice.receptor ?? null,
    forma_pago: invoice.forma_pago ?? null,
    forma_pago_nombre: invoice.forma_pago_nombre ?? null,
    metodo_pago: invoice.metodo_pago ?? null,
    metodo_pago_nombre: invoice.metodo_pago_nombre ?? null,
    uso_cfdi: invoice.uso_cfdi ?? null,
    uso_cfdi_nombre: invoice.uso_cfdi_nombre ?? null,
    cfdi_uuid: invoice.cfdi_uuid,
    cfdi_fecha_timbrado: invoice.cfdi_fecha_timbrado,
    cfdi_pendiente: invoice.cfdi_pendiente,
    cfdi_cancelado: invoice.cfdi_cancelado,
    cfdi_cancelacion_solicitada: invoice.cfdi_cancelacion_solicitada,
    cfdi_cancelacion_motivo: invoice.cfdi_cancelacion_motivo,
  },
  correo: invoice.correo_facturas,
});
