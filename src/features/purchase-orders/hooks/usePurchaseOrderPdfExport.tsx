import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { getPurchaseOrderColumnText } from "../utils/purchaseOrderExport";

/** Ancho relativo de cada columna en el PDF — O.C./Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrder>): number => {
  if (column.id === "folio") return 1.8;
  if (column.id === "proveedor_nombre") return 1.8;
  if (column.id === "progreso") return 1.6;
  return 1;
};

const createPurchaseOrdersPdfDocument = (
  renderer: Pick<
    typeof import("@react-pdf/renderer"),
    "Document" | "Page" | "Text" | "View" | "StyleSheet"
  >,
  orders: PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
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
            <Text style={styles.title}>Reporte de Órdenes de Compra</Text>
          </View>
          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Exportado:</Text>
              <Text style={styles.metaValue}>{today}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Registros:</Text>
              <Text style={styles.metaValue}>{orders.length}</Text>
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
          {orders.map((order, rowIndex) => (
            <View
              key={`${order.id}-${rowIndex}`}
              style={[
                styles.row,
                rowIndex % 2 !== 0 ? styles.rowOdd : {},
                rowIndex === orders.length - 1 ? styles.rowLast : {},
              ]}
            >
              {columns.map((column, colIndex) => (
                <Text
                  key={`${order.id}-${column.id}`}
                  style={[styles.cell, { width: columnWidths[colIndex] }]}
                >
                  {getPurchaseOrderColumnText(order, column)}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Pie de página fijo en todas las páginas */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {orders.length} registro{orders.length !== 1 ? "s" : ""} — Generado con ERP Lazzar
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
 * Exporta el listado VISIBLE de órdenes de compra a PDF. Mismo patrón que
 * `useQuotePdfExport`: `@react-pdf/renderer` se importa dinámicamente (solo
 * al exportar, no en el bundle inicial) y el disparo llega por un
 * `CustomEvent` propio (`purchase-orders:exportPDF`).
 *
 * `getOrders` se invoca AL EXPORTAR (no al montar): son las filas filtradas y
 * ordenadas de TODAS las páginas que `DataTable` expone por `ref`
 * (`getFilteredRows`), leídas en ese instante — así el archivo no se queda
 * en la página visible ni con valores previos a un refetch.
 */
export const usePurchaseOrderPdfExport = (
  getOrders: () => PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
) => {
  const getOrdersRef = useRef(getOrders);
  const columnsRef = useRef(columns);

  useEffect(() => {
    getOrdersRef.current = getOrders;
  }, [getOrders]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToPdf = useCallback(async () => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const renderer = await import("@react-pdf/renderer");
    const pdfDocument = createPurchaseOrdersPdfDocument(
      {
        Document: renderer.Document,
        Page: renderer.Page,
        Text: renderer.Text,
        View: renderer.View,
        StyleSheet: renderer.StyleSheet,
      },
      getOrdersRef.current(),
      exportColumns,
    );
    const blob = await renderer.pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `ordenes-compra-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("purchase-orders:exportPDF", handleExport);
    return () => {
      document.removeEventListener("purchase-orders:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
