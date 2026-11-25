import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob } from "@/src/utils/listPdfBlob";
import { purchaseOrdersPdfProps } from "../utils/purchaseOrderListPdf";

/**
 * Exporta el listado VISIBLE de órdenes de compra a PDF. Mismo patrón que
 * `useQuotePdfExport`: el PDF (`generateListPdfBlob`) carga el
 * documento y `@react-pdf/renderer` solo al exportar y el disparo llega por un
 * `CustomEvent` propio (`purchase-orders:exportPDF`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de
 * la tabla (búsqueda, filtros y orden), página por página desde el backend
 * (`fetchAllRows` de `useServerTable`): la tabla en modo servidor solo tiene
 * la página visible.
 */
export const usePurchaseOrderPdfExport = (
  getRows: () => Promise<PurchaseOrder[]>,
  columns: DataTableVisibleColumn<PurchaseOrder>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "purchase-orders-export-pdf");

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current;
    if (exportColumns.length === 0) return;
    await runExport(async (rows) => {
      const now = new Date();
      const blob = await generateListPdfBlob(purchaseOrdersPdfProps(rows, exportColumns, now));
      downloadBlob(blob, datedFileName("ordenes-compra", "pdf", now));
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("purchase-orders:exportPDF", handleExport);
    return () => {
      document.removeEventListener("purchase-orders:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
