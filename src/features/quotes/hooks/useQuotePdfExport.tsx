import { useCallback, useEffect, useRef } from "react";
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

const isCurrencyColumn = (column: DataTableVisibleColumn<Quote>) => {
  const key = column.accessorKey ?? column.id;
  return key.startsWith("totals.") || ["Subtotal", "Descuento", "IVA", "Total", "Saldo"].includes(column.header);
};

const isRightAlignedColumn = (column: DataTableVisibleColumn<Quote>) => {
  const key = column.accessorKey ?? column.id;
  return key === "piezas" || isCurrencyColumn(column);
};

const formatValue = (value: unknown, column: DataTableVisibleColumn<Quote>) => {
  if (value === null || value === undefined) return "";
  if (isCurrencyColumn(column)) {
    return formatCurrency(Number(value) || 0);
  }
  return String(value);
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
  const styles = StyleSheet.create({
    page: {
      padding: 32,
      fontSize: 10,
      color: "#0f172a",
      backgroundColor: "#ffffff",
    },
    header: {
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 700,
      color: "#0f172a",
    },
    subtitle: {
      marginTop: 4,
      fontSize: 10,
      color: "#64748b",
    },
    summary: {
      marginTop: 8,
      fontSize: 10,
      color: "#0f172a",
    },
    table: {
      marginTop: 16,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      borderRadius: 8,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    headerRow: {
      backgroundColor: "#f8fafc",
    },
    cell: {
      fontSize: 9,
      color: "#0f172a",
    },
    headerCell: {
      fontSize: 9,
      color: "#64748b",
      fontWeight: 600,
    },
    cellBase: {
      flexGrow: 1,
      flexBasis: 0,
    },
    cellRight: {
      textAlign: "right",
    },
    muted: {
      color: "#64748b",
    },
  });

  const today = new Date().toLocaleDateString("es-MX");
  const getHeaderStyle = (column: DataTableVisibleColumn<Quote>) =>
    isRightAlignedColumn(column)
      ? [styles.headerCell, styles.cellBase, styles.cellRight]
      : [styles.headerCell, styles.cellBase];
  const getCellStyle = (column: DataTableVisibleColumn<Quote>) =>
    isRightAlignedColumn(column) ? [styles.cell, styles.cellBase, styles.cellRight] : [styles.cell, styles.cellBase];

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Órdenes</Text>
          <Text style={styles.subtitle}>Exportado el {today}</Text>
          <Text style={styles.summary}>Registros: {quotes.length}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col) => (
              <Text
                key={col.id}
                style={getHeaderStyle(col)}
              >
                {col.header}
              </Text>
            ))}
          </View>

          {quotes.map((quote, index) => (
            <View key={`${quote.id}-${index}`} style={styles.row}>
              {columns.map((column) => (
                <Text
                  key={`${quote.id}-${column.id}-${index}`}
                  style={getCellStyle(column)}
                >
                  {formatValue(getColumnValue(quote, column, index), column)}
                </Text>
              ))}
            </View>
          ))}
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
