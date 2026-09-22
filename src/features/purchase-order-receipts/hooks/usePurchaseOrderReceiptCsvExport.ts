import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptColumnText } from "../utils/purchaseOrderReceiptExport";

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
 * `getReceipts` se invoca AL EXPORTAR (no al montar): son las filas filtradas y
 * ordenadas de TODAS las páginas que `DataTable` expone por `ref`
 * (`getFilteredRows`), leídas en ese instante — así el archivo no se queda
 * en la página visible ni con valores previos a un refetch.
 */
export const usePurchaseOrderReceiptCsvExport = (
  getReceipts: () => PurchaseOrderReceipt[],
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
) => {
  const getReceiptsRef = useRef(getReceipts);
  const columnsRef = useRef(columns);

  useEffect(() => {
    getReceiptsRef.current = getReceipts;
  }, [getReceipts]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    if (columnsRef.current.length === 0) return;
    const csvContent = buildCsv(getReceiptsRef.current(), columnsRef.current);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `recepciones-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("purchase-order-receipts:exportCSV", handleExport);
    return () => {
      document.removeEventListener("purchase-order-receipts:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
