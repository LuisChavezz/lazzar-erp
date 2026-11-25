import { useCallback, useEffect, useRef } from "react";
import { datedFileName } from "@/src/utils/datedFileName";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { getPurchaseOrderColumnText } from "../utils/purchaseOrderExport";
import { downloadBlob } from "@/src/utils/downloadBlob";
import { generateListPdfBlob, listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — O.C./Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrder>): number => {
  if (column.id === "folio") return 1.8;
  if (column.id === "proveedor_nombre") return 1.8;
  if (column.id === "progreso") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
const purchaseOrdersPdfProps = (
  orders: PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Reporte de Órdenes de Compra",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: orders.map((order) => columns.map((column) => getPurchaseOrderColumnText(order, column))),
    now,
  });
};

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
