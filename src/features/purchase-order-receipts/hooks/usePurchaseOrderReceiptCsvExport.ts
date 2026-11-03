import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { loadExportRows } from "@/src/utils/loadExportRows";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptColumnText } from "../utils/purchaseOrderReceiptExport";
import { downloadBlob } from "@/src/utils/downloadBlob";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (
  receipts: PurchaseOrderReceipt[],
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
) => {
  const headers = columns.map((column) => column.header);
  const rows = receipts.map((receipt) =>
    columns.map((column) => getPurchaseOrderReceiptColumnText(receipt, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta el listado VISIBLE de recepciones a un CSV que Excel abre
 * directamente. Mismo patrón que `usePurchaseOrderCsvExport`/
 * `useQuoteCsvExport`: refs para no reconstruir el listener en cada render,
 * disparo por `CustomEvent` (`purchase-order-receipts:exportCSV`).
 *
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de
 * la tabla (búsqueda, filtros y orden), página por página desde el backend
 * (`fetchAllRows` de `useServerTable`): la tabla en modo servidor solo tiene
 * la página visible.
 */
export const usePurchaseOrderReceiptCsvExport = (
  getRows: () => Promise<PurchaseOrderReceipt[]>,
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
) => {
  const columnsRef = useRef(columns);
  const getRowsRef = useRef(getRows);

  useEffect(() => {
    columnsRef.current = columns;
    getRowsRef.current = getRows;
  }, [columns, getRows]);

  const exportToCsv = useCallback(async () => {
    if (columnsRef.current.length === 0) return;
    const rows = await loadExportRows(getRowsRef.current, "purchase-order-receipts-export");
    if (rows === null) return;
    const csvContent = buildCsv(rows, columnsRef.current);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const today = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `recepciones-${today}.csv`);
  }, []);

  useEffect(() => {
    const handleExport = () => {
      void exportToCsv();
    };
    document.addEventListener("purchase-order-receipts:exportCSV", handleExport);
    return () => {
      document.removeEventListener("purchase-order-receipts:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
