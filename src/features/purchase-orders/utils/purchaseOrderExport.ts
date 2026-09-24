import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * Texto plano por columna para los reportes CSV y PDF del listado (los
 * comparten `usePurchaseOrderCsvExport`/`usePurchaseOrderPdfExport`). No
 * reutiliza el `accessorFn`/`accessorKey` de cada columna tal cual: "O.C." y
 * "Progreso OC" son widgets compuestos pensados para pantalla
 * (folio+estatus+referencia; barra+%, ver `PurchaseOrderColumns`), no para
 * una celda de reporte — aquí se arma su propia representación de texto por
 * `column.id`.
 */
export const getPurchaseOrderColumnText = (
  order: PurchaseOrder,
  column: DataTableVisibleColumn<PurchaseOrder>,
): string => {
  switch (column.id) {
    case "folio":
      // Mismo identificador que el disparador del listado: el folio, o `#id`
      // mientras la orden no tiene folio (antes de confirmarse).
      return [order.folio ?? `#${order.id}`, order.estatus_label, order.referencia || null]
        .filter(Boolean)
        .join(" · ");
    case "fecha_oc":
      return formatLocalDate(order.fecha_oc);
    case "fecha_vencimiento":
      return formatLocalDate(order.fecha_vencimiento);
    case "total_piezas":
      return formatQuantityValue(order.total_piezas);
    case "progreso": {
      // Ver `PurchaseOrderColumns`: `surtido` queda en 0 A PROPÓSITO hasta
      // que el backend exponga la cantidad recibida agregada a nivel de
      // cabecera — no es un supuesto del cliente.
      const solicitado = order.total_piezas;
      const surtido = 0;
      const pct = solicitado > 0 ? Math.round((surtido / solicitado) * 100) : 0;
      return `${formatQuantityValue(surtido)} / ${formatQuantityValue(solicitado)} (${pct}%)`;
    }
    default:
      return String((order as unknown as Record<string, unknown>)[column.id] ?? "");
  }
};
