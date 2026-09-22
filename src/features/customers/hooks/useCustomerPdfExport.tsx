import { useCallback, useEffect, useRef, type RefObject } from "react";
import { Customer } from "../interfaces/customer.interface";
import { type DataTableHandle, DataTableVisibleColumn } from "@/src/components/DataTable";

const getValueByPath = (value: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
};

const getColumnValue = (
  customer: Customer,
  column: DataTableVisibleColumn<Customer>,
  index: number
) => {
  if (column.accessorFn) {
    return column.accessorFn(customer, index);
  }
  if (column.accessorKey) {
    return getValueByPath(customer, column.accessorKey);
  }
  return (customer as unknown as Record<string, unknown>)[column.id];
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const createCustomersPdfDocument = (
  renderer: Pick<
    typeof import("@react-pdf/renderer"),
    "Document" | "Page" | "Text" | "View" | "StyleSheet"
  >,
  customers: Customer[],
  columns: DataTableVisibleColumn<Customer>[]
) => {
  const { Document, Page, Text, View, StyleSheet } = renderer;
  const columnWidth = `${(100 / columns.length).toFixed(1)}%`;

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
        <View style={styles.headerSection}>
          <View>
            <Text style={styles.brand}>ERP LAZZAR</Text>
            <Text style={styles.title}>Reporte de Clientes</Text>
          </View>
          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Exportado:</Text>
              <Text style={styles.metaValue}>{today}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Registros:</Text>
              <Text style={styles.metaValue}>{customers.length}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            {columns.map((col) => (
              <Text key={col.id} style={[styles.headerCell, { width: columnWidth }]}>
                {col.header}
              </Text>
            ))}
          </View>

          {customers.map((customer, rowIndex) => (
            <View
              key={`${customer.id}-${rowIndex}`}
              style={[
                styles.row,
                rowIndex % 2 !== 0 ? styles.rowOdd : {},
                rowIndex === customers.length - 1 ? styles.rowLast : {},
              ]}
            >
              {columns.map((column) => (
                <Text key={`${customer.id}-${column.id}`} style={[styles.cell, { width: columnWidth }]}>
                  {formatValue(getColumnValue(customer, column, rowIndex))}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {customers.length} registro{customers.length !== 1 ? "s" : ""} — Generado con ERP Lazzar
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
 * `tableRef` es el `ref` de la `DataTable` de la vista; AL EXPORTAR (no al
 * montar) se leen de él las filas
 * filtradas y ordenadas que `DataTable` expone por `ref` (`getFilteredRows`),
 * leídas en ese instante. Guardar una copia en un ref dejaba en el archivo
 * valores y orden viejos tras un refetch que no cambiaba el número de filas.
 */
export const useCustomerPdfExport = (
  tableRef: RefObject<DataTableHandle<Customer> | null>,
  columns: DataTableVisibleColumn<Customer>[]
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToPdf = useCallback(async () => {
    if (columnsRef.current.length === 0) return;
    const renderer = await import("@react-pdf/renderer");
    const pdfDocument = createCustomersPdfDocument(
      {
        Document: renderer.Document,
        Page: renderer.Page,
        Text: renderer.Text,
        View: renderer.View,
        StyleSheet: renderer.StyleSheet,
      },
      tableRef.current?.getFilteredRows() ?? [],
      columnsRef.current
    );
    const blob = await renderer.pdf(pdfDocument).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `clientes-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [tableRef]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("customers:exportPDF", handleExport);
    return () => {
      document.removeEventListener("customers:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
