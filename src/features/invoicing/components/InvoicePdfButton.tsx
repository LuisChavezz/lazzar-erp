"use client";

import { OfficialCfdiButtons } from "@/src/components/OfficialCfdiButtons";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { documentPdfFolioLabel } from "@/src/pdfs/shared/documentPdfModel";
import type { Invoice } from "../interfaces/invoice.interface";
import { getInvoiceCfdiFile } from "../services/actions";
import { generateInvoicePdfBlob } from "../services/pdf/invoicePdfBlob";
import { hasInvoiceCfdi, invoicePdfDescriptor } from "../utils/invoicePdf";
import { invoicePdfSource } from "../utils/invoicePdfSource";

type InvoicePdfTarget = Pick<
  Invoice,
  "id" | "folio" | "estatus" | "cfdi_uuid" | "facturama_id" | "cfdi_cancelacion_motivo"
>;

/**
 * "Descargar PDF" de una factura de cliente (EC-859), en la barra de la página
 * de detalle, en sus dos hojas y en todo estatus: el documento del ERP sobre la
 * plantilla base.
 */
export function InvoicePdfButton({ invoice }: { invoice: InvoicePdfTarget }) {
  return (
    <DocumentPdfButton
      descriptor={invoicePdfDescriptor(invoice)}
      source={invoicePdfSource({ invoiceId: invoice.id, render: generateInvoicePdfBlob })}
    />
  );
}

/**
 * "Descargar CFDI (PDF)" y "(XML)" de una factura timbrada (EC-859): los
 * archivos OFICIALES de Facturama (`facturas/{id}/cfdi/?formato=`), como
 * `FAC-<folio>-CFDI.pdf` / `.xml`, en pareja como las del REP. Solo se montan
 * con CFDI (`hasInvoiceCfdi`).
 */
export function InvoiceCfdiButtons({ invoice }: { invoice: InvoicePdfTarget }) {
  return (
    <OfficialCfdiButtons
      mutationKey={["download-invoice-cfdi", invoice.id]}
      fetchFile={hasInvoiceCfdi(invoice) ? (format) => getInvoiceCfdiFile(invoice.id, format) : null}
      pdfFileName={documentPdfFileName("FAC", invoice.folio, invoice.id)}
      ofDocument="de la factura"
      folioLabel={documentPdfFolioLabel(invoice.folio, invoice.id)}
    />
  );
}
