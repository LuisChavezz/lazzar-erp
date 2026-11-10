import { useCallback, useEffect, useRef } from "react";
import { getLocalTodayDate } from "@/src/utils/formatDate";
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { useServerExport } from "@/src/hooks/useServerExport";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoExportRow } from "../interfaces/pedido-list.interface";
import { getProcurementOrderColumnText } from "../utils/procurementOrderExport";
import { downloadBlob } from "@/src/utils/downloadBlob";

const escapeCsv = (value: string) => {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const buildCsv = (
  orders: PedidoExportRow[],
  columns: DataTableVisibleColumn<PedidoListItem>[],
) => {
  const headers = columns.map((column) => column.header);
  const rows = orders.map((order) =>
    columns.map((column) => getProcurementOrderColumnText(order, column)),
  );
  return [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

/**
 * Exporta a un CSV que Excel abre directamente los pedidos de Compras › Pedidos
 * (modo servidor). Mismo patrón que `usePurchaseOrderCsvExport`: refs para no
 * reconstruir el listener en cada render y disparo por `CustomEvent`
 * (`procurement-orders:exportCSV`).
 *
 * `getRows` trae, AL EXPORTAR, TODO el conjunto de los criterios vigentes de la
 * tabla (búsqueda, filtros y orden) desde `GET /ventas/pedidos/exportar/`: la
 * tabla en modo servidor solo tiene la página visible.
 */
export const useProcurementOrderCsvExport = (
  getRows: () => Promise<PedidoExportRow[]>,
  columns: DataTableVisibleColumn<PedidoListItem>[],
) => {
  const columnsRef = useRef(columns);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  const runExport = useServerExport(getRows, "procurement-orders-export-csv");

  const exportToCsv = useCallback(async () => {
    const exportColumns = columnsRef.current;
    if (exportColumns.length === 0) return;
    await runExport((rows) => {
      const csvContent = buildCsv(rows, exportColumns);
      // BOM (`﻿`) para que Excel detecte UTF-8 y no rompa acentos/ñ.
      const blob = new Blob([`﻿${csvContent}`], {
        type: "text/csv;charset=utf-8;",
      });
      const today = getLocalTodayDate();
      downloadBlob(blob, `pedidos-${today}.csv`);
    });
  }, [runExport]);

  useEffect(() => {
    const handleExport = () => {
      void exportToCsv();
    };
    document.addEventListener("procurement-orders:exportCSV", handleExport);
    return () => {
      document.removeEventListener("procurement-orders:exportCSV", handleExport);
    };
  }, [exportToCsv]);

  return { exportToCsv };
};
