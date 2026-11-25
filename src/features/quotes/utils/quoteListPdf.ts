/**
 * PDF del listado de cotizaciones exportado (EC-959): de las filas y las
 * columnas visibles a las props de `ListPdfDocument` (variante `standard`).
 * Sin React ni react-pdf, para probarlo en `tests/unit/`; lo usa
 * `useQuotePdfExport`.
 */
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";
import type { Quote } from "../interfaces/quote.interface";
import { formatQuoteAmountOrDash } from "./quoteDetailsFormatters";
import {
  buildQuoteTotalRowCells,
  formatQuoteExportTotal,
  QUOTE_EXPORT_TOTAL_FIELD,
} from "./quoteExportTotals";

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

const CURRENCY_FIELD_KEYS = new Set([
  "gran_total",
  "importe_sin_iva",
  "subtotal",
  "descuento",
  "anticipo",
  "flete",
  "seguros",
]);

const DATE_FIELD_SUFFIXES = ["_at", "_date", "_fecha"];

const isCurrencyColumn = (column: DataTableVisibleColumn<Quote>): boolean => {
  const key = column.accessorKey ?? column.id;
  return key.startsWith("totals.") || CURRENCY_FIELD_KEYS.has(key);
};

const isDateColumn = (column: DataTableVisibleColumn<Quote>): boolean => {
  const key = column.accessorKey ?? column.id;
  return DATE_FIELD_SUFFIXES.some((suffix) => key.endsWith(suffix));
};

const isRightAlignedColumn = (column: DataTableVisibleColumn<Quote>): boolean => {
  const key = column.accessorKey ?? column.id;
  return key === "piezas" || isCurrencyColumn(column);
};

// Un importe va en la moneda de SU cotización (`moneda_codigo`), como en la
// tabla; sin moneda, sin símbolo (EC-618).
const formatValue = (value: unknown, column: DataTableVisibleColumn<Quote>, quote: Quote): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (isCurrencyColumn(column)) {
    return formatQuoteAmountOrDash(
      typeof value === "number" || typeof value === "string" ? value : null,
      quote.moneda_codigo,
    );
  }
  if (isDateColumn(column)) {
    try {
      const date = typeof value === "string" ? parseISO(value) : new Date(String(value));
      if (isValid(date)) return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      // fallback a string crudo
    }
  }
  return String(value);
};

const getColumnWeight = (column: DataTableVisibleColumn<Quote>): number => {
  const key = column.accessorKey ?? column.id;
  if (["cliente_razon_social", "cliente_nombre"].includes(key)) return 2.4;
  if (isDateColumn(column)) return 1.8;
  if (key === "piezas") return 0.7;
  if (isCurrencyColumn(column)) return 1.4;
  return 1.2;
};

/**
 * Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959)
 * con importes y piezas a la derecha, importes en negritas, el "Total general"
 * en el encabezado y la fila de totales bajo la columna de importe.
 */
export const quotesPdfProps = (quotes: Quote[], columns: DataTableVisibleColumn<Quote>[], now: Date) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);

  // Total por moneda de la columna visible de importe (EC-618).
  const grandTotal = formatQuoteExportTotal(quotes);
  const grandTotalColIndex = columns.findIndex(
    (col) => (col.accessorKey ?? col.id) === QUOTE_EXPORT_TOTAL_FIELD
  );

  return standardListPdfProps({
    title: "Reporte de Cotizaciones",
    columns: columns.map((column, i) => ({
      header: column.header,
      width: widths[i],
      align: isRightAlignedColumn(column) ? "right" : undefined,
      bold: isCurrencyColumn(column),
    })),
    rows: quotes.map((quote, rowIndex) =>
      columns.map((column) => formatValue(getColumnValue(quote, column, rowIndex), column, quote))
    ),
    // Una celda por columna, el total bajo la de importe y siempre con su
    // etiqueta (`buildQuoteTotalRowCells`).
    totalRow:
      grandTotalColIndex >= 0
        ? {
            cells: buildQuoteTotalRowCells(columns.length, grandTotalColIndex, grandTotal),
            valueIndex: grandTotalColIndex,
          }
        : null,
    extraMeta: [{ label: "Total general:", value: grandTotal }],
    now,
  });
};
