import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { getPurchaseOrderColumnText } from "../utils/purchaseOrderExport";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (
  orders: PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
) => {
  const headers = columns.map((column) => column.header);
  const rows = orders.map((order) =>
    columns.map((column) => getPurchaseOrderColumnText(order, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta el listado VISIBLE de órdenes de compra (filas y columnas tal
 * como las dejó `DataTable` tras búsqueda/filtro/orden/visibilidad de
 * columnas) a un CSV que Excel abre directamente. Mismo patrón que
 * `useQuoteCsvExport`: refs para no reconstruir el listener en cada render,
 * y el disparo llega por un `CustomEvent` propio (`purchase-orders:exportCSV`)
 * para no acoplar el botón de la vista con el hook.
 */
export const usePurchaseOrderCsvExport = (
  orders: PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
) => {
  const ordersRef = useRef(orders);
  const columnsRef = useRef(columns);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    const exportColumns = columnsRef.current.filter((column) => column.id !== "actions");
    if (exportColumns.length === 0) return;
    const csvContent = buildCsv(ordersRef.current, exportColumns);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `ordenes-compra-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("purchase-orders:exportCSV", handleExport);
    return () => {
      document.removeEventListener("purchase-orders:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
