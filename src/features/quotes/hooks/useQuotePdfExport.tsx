import { useCallback, useEffect, useRef } from "react";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Quote } from "../interfaces/quote.interface";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { DataTableVisibleColumn } from "@/src/components/DataTable";

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

const formatValue = (value: unknown, column: DataTableVisibleColumn<Quote>): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (isCurrencyColumn(column)) {
    return formatCurrency(Number(value) || 0);
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

const createQuotesPdfDocument = (
  renderer: Pick<
    typeof import("@react-pdf/renderer"),
    "Document" | "Page" | "Text" | "View" | "StyleSheet"
  >,
  quotes: Quote[],
  columns: DataTableVisibleColumn<Quote>[]
) => {
  const { Document, Page, Text, View, StyleSheet } = renderer;

  const totalWeight = columns.reduce((sum, col) => sum + getColumnWeight(col), 0);
  const columnWidths = columns.map(
    (col) => `${((getColumnWeight(col) / totalWeight) * 100).toFixed(1)}%`
  );

  const grandTotal = quotes.reduce((sum, q) => sum + (Number(q.gran_total) || 0), 0);

  const styles = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 44,
      paddingHorizontal: 28,
      fontSize: 9,
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    headerSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: "#cbd5e1",
    },
    brand: {
      fontSize: 7,
      color: "#0ea5e9",
      marginBottom: 4,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#0f172a",
    },
    metaGroup: {
      alignItems: "flex-end",
    },
    metaRow: {
      flexDirection: "row",
      marginTop: 3,
    },
    metaLabel: {
      fontSize: 7.5,
      color: "#94a3b8",
      marginRight: 4,
    },
    metaValue: {
      fontSize: 7.5,
      fontWeight: "bold",
      color: "#475569",
    },
    table: {
      marginTop: 4,
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingVertical: 6,
      paddingHorizontal: 4,
      minHeight: 22,
    },
    headerRow: {
      backgroundColor: "#1e293b",
      borderBottomWidth: 0,
      paddingVertical: 8,
      borderRadius: 4,
    },
    rowOdd: {
      backgroundColor: "#f8fafc",
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    headerCell: {
      fontSize: 7,
      fontWeight: "bold",
      color: "#94a3b8",
      paddingHorizontal: 5,
    },
    cell: {
      fontSize: 8,
      color: "#334155",
      paddingHorizontal: 5,
    },
    cellRight: {
      textAlign: "right",
    },
    cellCurrency: {
      fontWeight: "bold",
      color: "#0f172a",
    },
    totalRow: {
      flexDirection: "row",
      borderTopWidth: 2,
      borderTopColor: "#1e293b",
      paddingVertical: 7,
      paddingHorizontal: 4,
      marginTop: 2,
    },
    totalLabel: {
      fontSize: 8,
      fontWeight: "bold",
      color: "#0f172a",
      paddingHorizontal: 5,
      flexGrow: 1,
    },
    totalValue: {
      fontSize: 9,
      fontWeight: "bold",
      color: "#0f172a",
      paddingHorizontal: 5,
      textAlign: "right",
    },
    footer: {
      position: "absolute",
      bottom: 18,
      left: 28,
      right: 28,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 6,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
    },
    footerText: {
      fontSize: 7,
      color: "#94a3b8",
    },
  });

  const today = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const grandTotalColIndex = columns.findIndex(
    (col) => (col.accessorKey ?? col.id) === "gran_total"
  );

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.brand}>ERP LAZZAR</Text>
            <Text style={styles.title}>Reporte de Cotizaciones</Text>
          </View>
          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Exportado:</Text>
              <Text style={styles.metaValue}>{today}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Registros:</Text>
              <Text style={styles.metaValue}>{quotes.length}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Total general:</Text>
              <Text style={styles.metaValue}>{formatCurrency(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          {/* Fila de cabeceras */}
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col, i) => (
              <Text
                key={col.id}
                style={[
                  styles.headerCell,
                  { width: columnWidths[i] },
                  isRightAlignedColumn(col) ? styles.cellRight : {},
                ]}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {/* Filas de datos */}
          {quotes.map((quote, rowIndex) => (
            <View
              key={`${quote.id}-${rowIndex}`}
              style={[
                styles.row,
                rowIndex % 2 !== 0 ? styles.rowOdd : {},
                rowIndex === quotes.length - 1 ? styles.rowLast : {},
              ]}
            >
              {columns.map((column, colIndex) => (
                <Text
                  key={`${quote.id}-${column.id}`}
                  style={[
                    styles.cell,
                    { width: columnWidths[colIndex] },
                    isRightAlignedColumn(column) ? styles.cellRight : {},
                    isCurrencyColumn(column) ? styles.cellCurrency : {},
                  ]}
                >
                  {formatValue(getColumnValue(quote, column, rowIndex), column)}
                </Text>
              ))}
            </View>
          ))}

          {/* Fila de totales */}
          {grandTotalColIndex >= 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { width: columnWidths.slice(0, grandTotalColIndex).join("") }]}>
                Total
              </Text>
              {columns.map((col, i) => (
                <Text
                  key={`total-${col.id}`}
                  style={[
                    styles.totalValue,
                    { width: columnWidths[i] },
                  ]}
                >
                  {i === grandTotalColIndex ? formatCurrency(grandTotal) : ""}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Pie de página fijo en todas las páginas */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {quotes.length} registro{quotes.length !== 1 ? "s" : ""} — Generado con ERP Lazzar
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
              `Página ${pageNumber} de ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
};

export const useQuotePdfExport = (quotes: Quote[], columns: DataTableVisibleColumn<Quote>[]) => {
  const quotesRef = useRef(quotes);
  const columnsRef = useRef(columns);

  useEffect(() => {
    quotesRef.current = quotes;
  }, [quotes]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const renderer = await import("@react-pdf/renderer");
    const pdfDocument = createQuotesPdfDocument(
      {
        Document: renderer.Document,
        Page: renderer.Page,
        Text: renderer.Text,
        View: renderer.View,
        StyleSheet: renderer.StyleSheet,
      },
      quotesRef.current,
      exportColumns
    );
    const blob = await renderer.pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `quotes-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("quotes:exportPDF", handleExport);
    return () => {
      document.removeEventListener("quotes:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
