import { useCallback, useEffect, useRef } from "react";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { DataTableVisibleColumn } from "@/src/components/DataTable";

const escapeCsv = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return "";
  const stringValue = String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
};

const getValueByPath = (value: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
};

const getColumnValue = (
  quote: Quote,
  column: DataTableVisibleColumn<Quote>,
  index: number
) => {
  if (column.accessorFn) {
    return column.accessorFn(quote, index);
  }
  if (column.accessorKey) {
    return getValueByPath(quote, column.accessorKey);
  }
  return (quote as unknown as Record<string, unknown>)[column.id];
};

// Mismo criterio que `useQuotePdfExport`: se detecta por la CLAVE del campo
// (`accessorKey`, o `id` a falta de ella), no por la etiqueta del encabezado
// — así "Importe sin IVA" sale formateado y renombrar una columna no rompe
// la exportación en silencio.
const CURRENCY_FIELD_KEYS = new Set([
  "gran_total",
  "importe_sin_iva",
  "subtotal",
  "descuento",
  "anticipo",
  "flete",
  "seguros",
]);

const isCurrencyColumn = (column: DataTableVisibleColumn<Quote>) => {
  const key = column.accessorKey ?? column.id;
  return key.startsWith("totals.") || CURRENCY_FIELD_KEYS.has(key);
};

const formatValue = (value: unknown, column: DataTableVisibleColumn<Quote>) => {
  if (value === null || value === undefined) return "";
  if (isCurrencyColumn(column)) {
    return formatCurrency(Number(value) || 0);
  }
  return String(value);
};

const buildCsv = (quotes: Quote[], columns: DataTableVisibleColumn<Quote>[]) => {
  const exportColumns = columns.filter((column) => column.id !== "actions");
  const headers = exportColumns.map((column) => column.header);
  const rows = quotes.map((quote, index) =>
    exportColumns.map((column) => formatValue(getColumnValue(quote, column, index), column))
  );

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

/**
 * `getQuotes` se invoca AL EXPORTAR (no al montar): son las filas filtradas y
 * ordenadas que `DataTable` expone por `ref` (`getFilteredRows`), leídas en
 * ese instante. Guardar una copia en un ref dejaba en el archivo valores y
 * orden viejos tras un refetch que no cambiaba el número de filas.
 */
export const useQuoteCsvExport = (
  getQuotes: () => Quote[],
  columns: DataTableVisibleColumn<Quote>[]
) => {
  const getQuotesRef = useRef(getQuotes);
  const columnsRef = useRef(columns);

  useEffect(() => {
    getQuotesRef.current = getQuotes;
  }, [getQuotes]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const csvContent = buildCsv(getQuotesRef.current(), exportColumns);
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `quotes-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("quotes:exportCSV", handleExport);
    return () => {
      document.removeEventListener("quotes:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
