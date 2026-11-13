"use client";

import { DocumentPdfButton } from "@/src/components/DocumentPdfButton";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";
import { generateStockTransferPdfBlob } from "../services/pdf/stockTransferPdfBlob";
import { stockTransferPdfDescriptor } from "../utils/stockTransferPdf";
import { stockTransferPdfSource } from "../utils/stockTransferPdfSource";

/**
 * "Descargar PDF" de un traspaso (EC-858), junto al título de
 * `StockTransferDetailDialog`, en todos los lugares que lo abren: el listado de
 * traspasos, el detalle de un surtido y la bitácora de documentos.
 */
export function StockTransferPdfButton({
  transfer,
}: {
  transfer: Pick<TransferenciaListItem, "id" | "folio" | "status">;
}) {
  return (
    <DocumentPdfButton
      descriptor={stockTransferPdfDescriptor(transfer)}
      source={stockTransferPdfSource({ transferId: transfer.id, render: generateStockTransferPdfBlob })}
      compact
    />
  );
}
