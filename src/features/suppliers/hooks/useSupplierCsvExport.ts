import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { loadExportRows } from "@/src/utils/loadExportRows";
import type { Supplier } from "../interfaces/supplier.interface";
import { getSupplierColumnText } from "../utils/supplierExport";
import { downloadBlob } from "@/src/utils/downloadBlob";

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
 * `getRows` trae, AL EXPORTAR, TODAS las filas de los criterios vigentes de
 * la tabla (búsqueda y orden), página por página desde el backend
 * (`fetchAllRows` de `useServerTable`): la tabla en modo servidor solo tiene
 * la página visible.
 */
export const useSupplierCsvExport = (
  getRows: () => Promise<Supplier[]>,
  columns: DataTableVisibleColumn<Supplier>[],
) => {
  const columnsRef = useRef(columns);
  const getRowsRef = useRef(getRows);

  useEffect(() => {
    columnsRef.current = columns;
    getRowsRef.current = getRows;
  }, [columns, getRows]);

  const exportToCsv = useCallback(async () => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const rows = await loadExportRows(getRowsRef.current, "suppliers-export");
    if (rows === null) return;
    const csvContent = buildCsv(rows, exportColumns);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const today = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `proveedores-${today}.csv`);
  }, []);

  useEffect(() => {
    const handleExport = () => {
      void exportToCsv();
    };
    document.addEventListener("suppliers:exportCSV", handleExport);
    return () => {
      document.removeEventListener("suppliers:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
