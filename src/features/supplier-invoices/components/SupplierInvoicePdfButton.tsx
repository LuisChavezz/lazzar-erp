"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";
import { generateSupplierInvoicePdfBlob } from "../services/pdf/supplierInvoicePdfBlob";
import { supplierInvoicePdfDescriptor } from "../utils/supplierInvoicePdf";
import { supplierInvoicePdfSource } from "../utils/supplierInvoicePdfSource";

/**
 * "Descargar PDF" de una factura de proveedor (EC-859), junto al título de
 * `SupplierInvoiceDetailDialog`, en todo estatus y con o sin PDF adjunto: el
 * documento del ERP. "Descargar OC + RC + factura" (`pdf-fusionado/`) sigue
 * aparte, en el cuerpo, y solo con adjunto.
 */
export function SupplierInvoicePdfButton({
  factura,
}: {
  factura: Pick<FacturaProveedor, "id" | "folio" | "estatus">;
}) {
  return (
    <DocumentPdfButton
      descriptor={supplierInvoicePdfDescriptor(factura)}
      source={supplierInvoicePdfSource({ facturaId: factura.id, render: generateSupplierInvoicePdfBlob })}
      compact
    />
  );
}
