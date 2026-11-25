/**
 * PDF del listado exportado (EC-959): de las filas y las columnas visibles a las
 * props de `ListPdfDocument` (variante `standard`). Sin React ni react-pdf, para
 * probarlo en `tests/unit/`; lo usa `useProcurementOrderPdfExport`.
 */
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PedidoListItem } from "../interfaces/order.interface";
import type { PedidoExportRow } from "../interfaces/pedido-list.interface";
import { getProcurementOrderColumnText } from "./procurementOrderExport";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — Folio/Cliente llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PedidoListItem>): number => {
  if (column.id === "folio") return 1.6;
  if (column.id === "cliente") return 2;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
export const procurementOrdersPdfProps = (
  orders: PedidoExportRow[],
  columns: DataTableVisibleColumn<PedidoListItem>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Reporte de Pedidos",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: orders.map((order) => columns.map((column) => getProcurementOrderColumnText(order, column))),
    now,
  });
};
