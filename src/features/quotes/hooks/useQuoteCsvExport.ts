import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Quote } from "../interfaces/quote.interface";
import { type DataTableHandle, DataTableVisibleColumn } from "@/src/components/DataTable";
import { downloadBlob } from "@/src/utils/downloadBlob";

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
// — así "Importe sin IVA" sale como importe y renombrar una columna no rompe
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

/** Encabezado de la columna con el código de moneda de cada cotización. */
export const QUOTE_CSV_CURRENCY_HEADER = "Moneda";

/**
 * Importe como NÚMERO plano ("1227.00": sin símbolo, sin separador de miles,
 * punto decimal, 2 decimales) para que una hoja de cálculo lo sume (EC-618).
 * La moneda va en su propia columna. Vacío si falta o no es número.
 */
const formatAmountCell = (value: unknown): string => {
  if (typeof value !== "number" && typeof value !== "string") return "";
  if (value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
};

const formatValue = (value: unknown, column: DataTableVisibleColumn<Quote>) => {
  if (value === null || value === undefined) return "";
  if (isCurrencyColumn(column)) return formatAmountCell(value);
  return String(value);
};

type CsvColumn = { header: string; value: (quote: Quote, index: number) => string };

/**
 * CSV de las cotizaciones con las columnas visibles. Los importes van como
 * número y, junto a ellos (tras la última columna de importe, o al final si
 * no hay ninguna), una columna "Moneda" con el `moneda_codigo` de la fila
 * (vacía sin moneda): importes de monedas distintas no se distinguen solo por
 * el número.
 */
export const buildQuotesCsv = (quotes: Quote[], columns: DataTableVisibleColumn<Quote>[]) => {
  const exportColumns = columns.filter((column) => column.id !== "actions");
  const csvColumns: CsvColumn[] = exportColumns.map((column) => ({
    header: column.header,
    value: (quote, index) => formatValue(getColumnValue(quote, column, index), column),
  }));
  const lastAmountIndex = exportColumns.findLastIndex(isCurrencyColumn);
  csvColumns.splice(lastAmountIndex >= 0 ? lastAmountIndex + 1 : csvColumns.length, 0, {
    header: QUOTE_CSV_CURRENCY_HEADER,
    value: (quote) => quote.moneda_codigo ?? "",
  });

  const headers = csvColumns.map((column) => column.header);
  const rows = quotes.map((quote, index) => csvColumns.map((column) => column.value(quote, index)));

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

/**
 * `tableRef` es el `ref` de la `DataTable` de la vista; AL EXPORTAR (no al
 * montar) se leen de él las filas filtradas y
 * ordenadas que `DataTable` expone por `ref` (`getFilteredRows`), leídas en
 * ese instante. Guardar una copia en un ref dejaba en el archivo valores y
 * orden viejos tras un refetch que no cambiaba el número de filas.
 */
export const useQuoteCsvExport = (
  tableRef: RefObject<DataTableHandle<Quote> | null>,
  columns: DataTableVisibleColumn<Quote>[]
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const csvContent = buildQuotesCsv(tableRef.current?.getFilteredRows() ?? [], exportColumns);
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const today = new Date().toISOString().split("T")[0];
    downloadBlob(blob, `quotes-${today}.csv`);
  }, [tableRef]);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("quotes:exportCSV", handleExport);
    return () => {
      document.removeEventListener("quotes:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
