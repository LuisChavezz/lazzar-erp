import { useCallback, useEffect } from "react";
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

const buildCsv = (orders: Order[], columns: DataTableVisibleColumn<Order>[]) => {
  const exportColumns = columns.filter((column) => column.id !== "actions");
  const headers = exportColumns.map((column) => column.header);
  const rows = orders.map((order, index) =>
    exportColumns.map((column) => formatValue(getColumnValue(order, column, index), column))
  );

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
};

export const useOrdersCsvExport = (orders: Order[], columns: DataTableVisibleColumn<Order>[]) => {
  const exportToCsv = useCallback(() => {
    const exportColumns = columns.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const csvContent = buildCsv(orders, exportColumns);
    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `orders-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [orders, columns]);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("orders:exportCSV", handleExport);
    return () => {
      document.removeEventListener("orders:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
