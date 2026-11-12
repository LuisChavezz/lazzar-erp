"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { ReceiptDetail } from "../interfaces/receipt.interface";
import { generateReceiptPdfBlob } from "../services/pdf/receiptPdfBlob";
import { receiptPdfDescriptor } from "../utils/receiptPdf";
import { receiptPdfSource } from "../utils/receiptPdfSource";

/**
 * "Descargar PDF" de una recepción (EC-856), junto al título de sus diálogos de
 * detalle (`PurchaseOrderReceiptDetailDialog` en Compras y `ReceiptDetailDialog`
 * en WMS y auditoría). Sirve para ambos orígenes (OC y OP).
 */
export function ReceiptPdfButton({ receipt }: { receipt: Pick<ReceiptDetail, "id" | "folio" | "estatus"> }) {
  return (
    <DocumentPdfButton
      descriptor={receiptPdfDescriptor(receipt)}
      source={receiptPdfSource(receipt.id, generateReceiptPdfBlob)}
      compact
    />
  );
}
