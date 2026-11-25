/**
 * PDF del listado de cotizaciones exportado (EC-959): de las filas y las
 * columnas visibles a las props de `ListPdfDocument` (variante `standard`).
 * Sin React ni react-pdf, para probarlo en `tests/unit/`; lo usa
 * `useQuotePdfExport`.
 */
import { parseISO, isValid } from "date-fns";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";
import { getMexicoTimeHHMM, getMexicoTodayDate, isCalendarDateKey } from "@/src/utils/mexicoTime";
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

/**
 * Fecha y hora "dd/MM/yyyy HH:mm" de un datetime en la zona de México
 * (`MEXICO_TIME_ZONE`, la del backend), no en la del navegador: con el equipo
 * en Los Ángeles, las 00:30 del 26 en México siguen saliendo "26/11/2026
 * 00:30". Usa el día y la hora de pared de `mexicoTime` (`Intl`). Una
 * fecha-calendario "AAAA-MM-DD" no es un instante: sale tal cual, a las 00:00.
 * `null` si no parsea (la celda muestra el texto crudo).
 */
const formatQuoteDateTime = (value: unknown): string | null => {
  if (typeof value === "string" && isCalendarDateKey(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year} 00:00`;
  }
  const date = typeof value === "string" ? parseISO(value) : new Date(String(value));
  if (!isValid(date)) return null;
  const [year, month, day] = getMexicoTodayDate(date).split("-");
  return `${day}/${month}/${year} ${getMexicoTimeHHMM(date.toISOString())}`;
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
    const text = formatQuoteDateTime(value);
    if (text) return text;
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
