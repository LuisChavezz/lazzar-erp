import { useCallback, useEffect } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { Order } from "../interfaces/order.interface";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { DataTableVisibleColumn } from "@/src/components/DataTable";

const statusLabels: Record<Order["estatusPedido"], string> = {
  capturado: "Capturado",
  autorizado: "Autorizado",
  surtido: "Surtido",
  facturado: "Facturado",
  cancelado: "Cancelado",
};

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

const getValueByPath = (value: unknown, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, value);
};

const getColumnValue = (
  order: Order,
  column: DataTableVisibleColumn<Order>,
  index: number
) => {
  if (column.accessorFn) {
    return column.accessorFn(order, index);
  }
  if (column.accessorKey) {
    return getValueByPath(order, column.accessorKey);
  }
  return (order as unknown as Record<string, unknown>)[column.id];
};

const isCurrencyColumn = (column: DataTableVisibleColumn<Order>) => {
  const key = column.accessorKey ?? column.id;
  return key.startsWith("totals.") || ["Subtotal", "Descuento", "IVA", "Total", "Saldo"].includes(column.header);
};

const isRightAlignedColumn = (column: DataTableVisibleColumn<Order>) => {
  const key = column.accessorKey ?? column.id;
  return key === "piezas" || isCurrencyColumn(column);
};

const formatValue = (value: unknown, column: DataTableVisibleColumn<Order>) => {
  if (value === null || value === undefined) return "";
  if (column.accessorKey === "estatusPedido" || column.id === "estatusPedido") {
    return statusLabels[value as Order["estatusPedido"]] ?? String(value);
  }
  if (column.accessorKey === "piezas" || column.id === "piezas") {
    return typeof value === "number" ? value.toLocaleString("es-MX") : String(value);
  }
  if (isCurrencyColumn(column) && typeof value === "number") {
    return formatCurrency(value);
  }
  return String(value);
};

const OrdersPdfDocument = ({
  orders,
  columns,
}: {
  orders: Order[];
  columns: DataTableVisibleColumn<Order>[];
}) => {
  const today = new Date().toLocaleDateString("es-MX");
  const getHeaderStyle = (column: DataTableVisibleColumn<Order>) =>
    isRightAlignedColumn(column)
      ? [styles.headerCell, styles.cellBase, styles.cellRight]
      : [styles.headerCell, styles.cellBase];
  const getCellStyle = (column: DataTableVisibleColumn<Order>) =>
    isRightAlignedColumn(column) ? [styles.cell, styles.cellBase, styles.cellRight] : [styles.cell, styles.cellBase];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Reporte de Órdenes</Text>
          <Text style={styles.subtitle}>Exportado el {today}</Text>
          <Text style={styles.summary}>Registros: {orders.length}</Text>
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

          {orders.map((order, index) => (
            <View key={`${order.folio}-${index}`} style={styles.row}>
              {columns.map((column) => (
                <Text
                  key={`${order.folio}-${column.id}-${index}`}
                  style={getCellStyle(column)}
                >
                  {formatValue(getColumnValue(order, column, index), column)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
};

export const useOrdersPdfExport = (orders: Order[], columns: DataTableVisibleColumn<Order>[]) => {
  const exportToPdf = useCallback(async () => {
    const exportColumns = columns.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const blob = await pdf(<OrdersPdfDocument orders={orders} columns={exportColumns} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `orders-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders, columns]);

  useEffect(() => {
    const handleExport = () => {
      void exportToPdf();
    };
    document.addEventListener("orders:exportPDF", handleExport);
    return () => {
      document.removeEventListener("orders:exportPDF", handleExport);
    };
  }, [exportToPdf]);

  return { exportToPdf };
};
