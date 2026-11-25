import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob } from "@/src/utils/listPdfBlob";
import { purchaseOrderReceiptsPdfProps } from "../utils/purchaseOrderReceiptListPdf";

/**
 * Exporta el listado VISIBLE de recepciones a PDF. Mismo patrón que
 * `usePurchaseOrderPdfExport`/`useQuotePdfExport`: `@react-pdf/renderer` se
 * importa dinámicamente (solo al exportar) y el disparo llega por un
 * `CustomEvent` propio (`purchase-order-receipts:exportPDF`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de
 * la tabla (búsqueda, filtros y orden), página por página desde el backend
 * (`fetchAllRows` de `useServerTable`): la tabla en modo servidor solo tiene
 * la página visible.
 */
export const usePurchaseOrderReceiptPdfExport = (
  getRows: () => Promise<PurchaseOrderReceipt[]>,
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "purchase-order-receipts-export-pdf");

  const exportToPdf = useCallback(async () => {
    if (columnsRef.current.length === 0) return;
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(purchaseOrderReceiptsPdfProps(rows, columnsRef.current, now));
      downloadBlob(blob, datedFileName("recepciones", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("purchase-order-receipts:exportPDF", handleExport);
    return () => {
      document.removeEventListener("purchase-order-receipts:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
