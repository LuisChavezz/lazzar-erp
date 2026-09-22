import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { getPedidoEstatusConfig } from "../constants/pedidoStatus";
import type { PedidoListItem } from "../interfaces/order.interface";

/**
 * Texto plano por columna para los reportes CSV y PDF del listado de
 * "Pedidos" en Compras (`useProcurementOrderCsvExport`/
 * `useProcurementOrderPdfExport`). La columna "folio" es un widget compuesto
 * pensado para pantalla (punto de estatus + folio + OC como mini-pill, ver
 * `ProcurementOrderColumns`), no para una celda de reporte — aquí se arma su
 * propia representación de texto por `column.id`. Mismo criterio que
 * `purchaseOrderExport.ts`.
 */
export const getProcurementOrderColumnText = (
  order: PedidoListItem,
  column: DataTableVisibleColumn<PedidoListItem>,
): string => {
  switch (column.id) {
    case "folio":
      return [order.folio ?? "—", getPedidoEstatusConfig(order.estatus).label, order.oc || null]
        .filter(Boolean)
        .join(" · ");
    case "cliente":
      return [order.cliente_razon_social, order.cliente_nombre].filter(Boolean).join(" — ");
    case "created_at":
      return formatLocalDate(order.created_at);
    case "fecha_confirmacion":
      return formatLocalDate(order.fecha_confirmacion);
    case "gran_total":
      return formatMoneyValueOrDash(order.gran_total);
    default:
      return String((order as unknown as Record<string, unknown>)[column.id] ?? "");
  }
};
