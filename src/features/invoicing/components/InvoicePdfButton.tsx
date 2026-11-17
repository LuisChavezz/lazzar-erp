"use client";

import { CfdiDownloadButton } from "@/src/components/CfdiDownloadButton";
import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import { useOfficialCfdiDownload } from "@/src/hooks/useOfficialCfdiDownload";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { documentPdfFolioLabel } from "@/src/pdfs/shared/documentPdfModel";
import { officialCfdiFileName } from "@/src/utils/officialCfdiFile";
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
 * "Descargar CFDI" de una factura timbrada (EC-859): el PDF OFICIAL de
 * Facturama (`facturas/{id}/cfdi/`), como `FAC-<folio>-CFDI.pdf`. Solo se
 * monta con CFDI (`hasInvoiceCfdi`).
 */
export function InvoiceCfdiButton({ invoice }: { invoice: InvoicePdfTarget }) {
  const { download, isDownloading } = useOfficialCfdiDownload({
    mutationKey: ["download-invoice-cfdi", invoice.id, "pdf"],
    format: "pdf",
    fetchFile: hasInvoiceCfdi(invoice) ? () => getInvoiceCfdiFile(invoice.id, "pdf") : null,
    fileName: officialCfdiFileName(documentPdfFileName("FAC", invoice.folio, invoice.id)),
    ofDocument: "de la factura",
  });
  return (
    <CfdiDownloadButton
      download={download}
      isDownloading={isDownloading}
      folioLabel={documentPdfFolioLabel(invoice.folio, invoice.id)}
    />
  );
}
