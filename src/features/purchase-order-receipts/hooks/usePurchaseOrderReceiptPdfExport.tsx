import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptColumnText } from "../utils/purchaseOrderReceiptExport";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob, listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — Folio/Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrderReceipt>): number => {
  if (column.id === "folio") return 1.6;
  if (column.id === "proveedor_nombre") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
const purchaseOrderReceiptsPdfProps = (
  receipts: PurchaseOrderReceipt[],
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Reporte de Recepciones",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: receipts.map((receipt) => columns.map((column) => getPurchaseOrderReceiptColumnText(receipt, column))),
    now,
  });
};

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
