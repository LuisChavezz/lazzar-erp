import Link from "next/link";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { purchaseOrderStatusEntry } from "@/src/features/purchase-orders/constants/purchaseOrderStatus";
import { purchaseOrderDetailHref } from "@/src/features/purchase-orders/constants/purchaseOrderDetailOrigins";
import type { PurchaseOrder } from "@/src/features/purchase-orders/interfaces/purchase-order.interface";
import type { SupplierPurchaseOrderHistoryFilters } from "../utils/supplierPurchaseOrderHistoryFilters";

const columnHelper = createColumnHelper<PurchaseOrder>();

/**
 * Columnas del historial de órdenes de compra de un proveedor.
 *
 * Ninguna es ordenable: con `serverPagination` el propio `DataTable` desactiva
 * el orden en cliente (el backend usa un orden FIJO, `-fecha_oc, -id`).
 *
 * El folio enlaza al detalle de la OC con `?from=supplier`, el id del
 * proveedor y los filtros/página actuales, para que su "Volver" regrese a esta
 * misma vista.
 */
export const getSupplierPurchaseOrderHistoryColumns = (
  supplierId: number,
  filters: SupplierPurchaseOrderHistoryFilters,
): ColumnDef<PurchaseOrder>[] =>
  [
    columnHelper.accessor((row) => row.folio ?? `#${row.id}`, {
      id: "folio",
      header: "Folio",
      enableHiding: false,
      cell: ({ row, getValue }) => (
        // Un folio nulo (OC aún sin confirmar) se rotula `#id` y SIGUE siendo
        // enlace: sin texto, el `<a>` colapsaría a 0×0 px.
        <Link
          href={purchaseOrderDetailHref(row.original.id, "supplier", {
            proveedor: supplierId,
            filters,
          })}
          className="font-mono text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
          title="Ver detalle"
        >
          {getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor("fecha_oc", {
      header: "Fecha OC",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("estatus", {
      header: "Estatus",
      meta: { align: "center" },
      cell: ({ row }) => (
        <StatusBadge
          status={String(row.original.estatus)}
          config={{
            [row.original.estatus]: purchaseOrderStatusEntry(
              row.original.estatus,
              row.original.estatus_label,
            ),
          }}
        />
      ),
    }),
    columnHelper.accessor("fecha_entrega_estimada", {
      header: "Entrega estimada",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("gran_total", {
      header: "Total",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-200 tabular-nums">
          {formatMoneyValueOrDash(row.original.gran_total, {
            currency: row.original.moneda_codigo,
          })}
        </span>
      ),
    }),
  ] as ColumnDef<PurchaseOrder>[];
