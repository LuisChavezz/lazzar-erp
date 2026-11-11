"use client";

import { PickingDetailByIdDialog } from "@/src/features/picking/components/PickingDetailByIdDialog";
import { PackingDetailByIdDialog } from "@/src/features/packing/components/PackingDetailByIdDialog";
import { ReceiptDetailDialog } from "@/src/features/receipts/components/ReceiptDetailDialog";
import { StockTransferDetailDialog } from "@/src/features/stock-transfers/components/StockTransferDetailDialog";
import { StockMovementDetailByIdDialog } from "@/src/features/stock-movements/components/StockMovementDetailByIdDialog";
import type { TipoDocumento } from "../interfaces/document-audit.interface";

/** Documento abierto en diálogo desde la bitácora. */
export interface OpenAuditDocument {
  tipo: TipoDocumento;
  id: number;
}

interface DocumentAuditDocumentDialogProps {
  document: OpenAuditDocument;
  onClose: () => void;
}

/**
 * Diálogo de detalle del documento de un evento. Cada uno se abastece solo por
 * id. Lo monta la VISTA (no la celda) mientras haya un documento abierto: las
 * celdas se desmontan al cargar más filas o cambiar de filtros.
 *
 * Recepción usa `ReceiptDetailDialog` (vista de WMS) y no
 * `ReceiptDetailByIdDialog`: ambos leen `GET /compras/recepciones/{id}/`, pero
 * el segundo envuelve el detalle de Compras, que solo sabe pintar recepciones
 * de OC; la bitácora registra también las de OP.
 *
 * Solo los tipos con `kind: "dialog"` de `DOCUMENT_AUDIT_OPENERS` llegan aquí;
 * cualquier otro no pinta nada.
 */
export function DocumentAuditDocumentDialog({ document, onClose }: DocumentAuditDocumentDialogProps) {
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  switch (document.tipo) {
    case "picking":
      return <PickingDetailByIdDialog orderId={document.id} open onOpenChange={onOpenChange} />;
    case "packing":
      return <PackingDetailByIdDialog orderId={document.id} open onOpenChange={onOpenChange} />;
    case "recepcion":
      return <ReceiptDetailDialog receiptId={document.id} open onOpenChange={onOpenChange} />;
    case "transferencia":
      return <StockTransferDetailDialog transferId={document.id} open onOpenChange={onOpenChange} />;
    case "movimiento_inventario":
      return <StockMovementDetailByIdDialog orderId={document.id} open onOpenChange={onOpenChange} />;
    default:
      return null;
  }
}
