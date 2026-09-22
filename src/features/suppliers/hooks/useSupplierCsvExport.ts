import { useCallback, useEffect, useRef, type RefObject } from "react";
import type { DataTableHandle, DataTableVisibleColumn } from "@/src/components/DataTable";
import type { Supplier } from "../interfaces/supplier.interface";
import { getSupplierColumnText } from "../utils/supplierExport";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (suppliers: Supplier[], columns: DataTableVisibleColumn<Supplier>[]) => {
  const headers = columns.map((column) => column.header);
  const rows = suppliers.map((supplier) =>
    columns.map((column) => getSupplierColumnText(supplier, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta el catálogo VISIBLE de proveedores a un CSV que Excel abre
 * directamente. Mismo patrón que `usePurchaseOrderCsvExport`/
 * `useQuoteCsvExport`: refs para no reconstruir el listener en cada render,
 * disparo por `CustomEvent` (`suppliers:exportCSV`).
 *
 * `tableRef` es el `ref` de la `DataTable` de la vista; AL EXPORTAR (no al
 * montar) se leen de él las filas filtradas y
 * ordenadas de TODAS las páginas que `DataTable` expone por `ref`
 * (`getFilteredRows`), leídas en ese instante — así el archivo no se queda
 * en la página visible ni con valores previos a un refetch.
 */
export const useSupplierCsvExport = (
  tableRef: RefObject<DataTableHandle<Supplier> | null>,
  columns: DataTableVisibleColumn<Supplier>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const csvContent = buildCsv(tableRef.current?.getFilteredRows() ?? [], exportColumns);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `proveedores-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tableRef]);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("suppliers:exportCSV", handleExport);
    return () => {
      document.removeEventListener("suppliers:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
