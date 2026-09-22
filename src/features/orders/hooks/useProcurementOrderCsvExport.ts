import { useCallback, useEffect, useRef } from "react";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PedidoListItem } from "../interfaces/order.interface";
import { getProcurementOrderColumnText } from "../utils/procurementOrderExport";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (
  orders: PedidoListItem[],
  columns: DataTableVisibleColumn<PedidoListItem>[],
) => {
  const headers = columns.map((column) => column.header);
  const rows = orders.map((order) =>
    columns.map((column) => getProcurementOrderColumnText(order, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta el listado VISIBLE de pedidos (Compras/SCM, `OrderListView` con
 * `variant="procurement"`) a un CSV que Excel abre directamente. Mismo
 * patrón que `usePurchaseOrderCsvExport`/`useQuoteCsvExport`: refs para no
 * reconstruir el listener en cada render, disparo por `CustomEvent`
 * (`procurement-orders:exportCSV`) para no acoplar el botón con el hook.
 *
 * `getOrders` se invoca AL EXPORTAR (no al montar): son las filas filtradas y
 * ordenadas de TODAS las páginas que `DataTable` expone por `ref`
 * (`getFilteredRows`), leídas en ese instante — así el archivo no se queda
 * en la página visible ni con valores previos a un refetch.
 */
export const useProcurementOrderCsvExport = (
  getOrders: () => PedidoListItem[],
  columns: DataTableVisibleColumn<PedidoListItem>[],
) => {
  const getOrdersRef = useRef(getOrders);
  const columnsRef = useRef(columns);

  useEffect(() => {
    getOrdersRef.current = getOrders;
  }, [getOrders]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const exportToCsv = useCallback(() => {
    if (columnsRef.current.length === 0) return;
    const csvContent = buildCsv(getOrdersRef.current(), columnsRef.current);
    // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
    const blob = new Blob([`﻿${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split("T")[0];
    link.href = url;
    link.download = `pedidos-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleExport = () => exportToCsv();
    document.addEventListener("procurement-orders:exportCSV", handleExport);
    return () => {
      document.removeEventListener("procurement-orders:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
