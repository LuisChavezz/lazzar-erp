import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptColumnText } from "../utils/purchaseOrderReceiptExport";

/** Ancho relativo de cada columna en el PDF — Folio/Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrderReceipt>): number => {
  if (column.id === "folio") return 1.6;
  if (column.id === "proveedor_nombre") return 1.6;
  return 1;
};

const createPurchaseOrderReceiptsPdfDocument = (
  renderer: Pick<
    typeof import("@react-pdf/renderer"),
    "Document" | "Page" | "Text" | "View" | "StyleSheet"
  >,
  receipts: PurchaseOrderReceipt[],
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
) => {
  const { Document, Page, Text, View, StyleSheet } = renderer;

  const totalWeight = columns.reduce((sum, col) => sum + getColumnWeight(col), 0);
  const columnWidths = columns.map(
    (col) => `${((getColumnWeight(col) / totalWeight) * 100).toFixed(1)}%`,
  );

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

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.brand}>ERP LAZZAR</Text>
            <Text style={styles.title}>Reporte de Recepciones</Text>
          </View>
          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Exportado:</Text>
              <Text style={styles.metaValue}>{today}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Registros:</Text>
              <Text style={styles.metaValue}>{receipts.length}</Text>
            </View>
          </View>
        </View>

        {/* Tabla */}
        <View style={styles.table}>
          {/* Fila de cabeceras */}
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col, i) => (
              <Text key={col.id} style={[styles.headerCell, { width: columnWidths[i] }]}>
                {col.header}
              </Text>
            ))}
          </View>

          {/* Filas de datos */}
          {receipts.map((receipt, rowIndex) => (
            <View
              key={`${receipt.id}-${rowIndex}`}
              style={[
                styles.row,
                rowIndex % 2 !== 0 ? styles.rowOdd : {},
                rowIndex === receipts.length - 1 ? styles.rowLast : {},
              ]}
            >
              {columns.map((column, colIndex) => (
                <Text
                  key={`${receipt.id}-${column.id}`}
                  style={[styles.cell, { width: columnWidths[colIndex] }]}
                >
                  {getPurchaseOrderReceiptColumnText(receipt, column)}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Pie de página fijo en todas las páginas */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {receipts.length} registro{receipts.length !== 1 ? "s" : ""} — Generado con ERP Lazzar
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

/**
 * Exporta el listado VISIBLE de recepciones a PDF. Mismo patrón que
 * `usePurchaseOrderPdfExport`/`useQuotePdfExport`: `@react-pdf/renderer` se
 * importa dinámicamente (solo al exportar) y el disparo llega por un
 * `CustomEvent` propio (`purchase-order-receipts:exportPDF`).
 *
 * `getReceipts` se invoca AL EXPORTAR (no al montar): son las filas filtradas y
 * ordenadas de TODAS las páginas que `DataTable` expone por `ref`
 * (`getFilteredRows`), leídas en ese instante — así el archivo no se queda
 * en la página visible ni con valores previos a un refetch.
 */
export const usePurchaseOrderReceiptPdfExport = (
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

  const exportToPdf = useCallback(async () => {
    if (columnsRef.current.length === 0) return;
    const renderer = await import("@react-pdf/renderer");
    const pdfDocument = createPurchaseOrderReceiptsPdfDocument(
      {
        Document: renderer.Document,
        Page: renderer.Page,
        Text: renderer.Text,
        View: renderer.View,
        StyleSheet: renderer.StyleSheet,
      },
      getReceiptsRef.current(),
      columnsRef.current,
    );
    const blob = await renderer.pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `recepciones-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("purchase-order-receipts:exportPDF", handleExport);
    return () => {
      document.removeEventListener("purchase-order-receipts:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
