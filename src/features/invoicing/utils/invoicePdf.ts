import { formatSatCancelMotive, isSatCancelMotive } from "@/src/constants/satCancelMotives";
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { hasOfficialCfdi } from "@/src/utils/officialCfdiFile";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { Invoice } from "../interfaces/invoice.interface";

/**
 * Identidad de una factura de cliente para su PDF (EC-859): código `FAC`. Los
 * folios de la serie de facturas (`F-00094`, `FAC-00068`) dan `FAC-F-00094.pdf`
 * y `FAC-00068.pdf`; no hace falta alias.
 *
 * La marca sale solo con `Cancelada` y dice "CANCELADA". El motivo impreso es
 * el del SAT, si la cancelación lo pidió (`cfdi_cancelacion_motivo`); el
 * motivo interno se agrega a `observaciones` y sale en sus notas.
 */
export const invoicePdfDescriptor = (
  invoice: Pick<Invoice, "id" | "folio" | "estatus"> & Partial<Pick<Invoice, "cfdi_cancelacion_motivo">>,
): DocumentPdfDescriptor => {
  const cancelled = invoice.estatus === INVOICE_STATUS.CANCELADA;
  const motivo = invoice.cfdi_cancelacion_motivo;
  return {
    type: "FAC",
    id: invoice.id,
    folio: invoice.folio,
    cancelled,
    ...(cancelled ? { cancelledLabel: "CANCELADA" } : {}),
    ...(cancelled && isSatCancelMotive(motivo) ? { cancellationReason: `SAT ${formatSatCancelMotive(motivo)}` } : {}),
  };
};

/** ¿La factura tiene CFDI timbrado que se pueda descargar ("Descargar CFDI")? */
export const hasInvoiceCfdi = (invoice: Pick<Invoice, "cfdi_uuid" | "facturama_id">): boolean =>
  hasOfficialCfdi(invoice.cfdi_uuid, invoice.facturama_id);
