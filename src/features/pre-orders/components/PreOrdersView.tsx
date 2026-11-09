"use client";

import { useState } from "react";
import Link from "next/link";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { ListTabs } from "@/src/components/ListTabs";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { usePreOrders } from "../hooks/usePreOrders";
import { SemaforoBadge } from "./PreOrderTracking";
import { isUrgentPreOrder, PreOrderTrackerMini } from "./PreOrderTracker";
import type { PreOrderListItem } from "../interfaces/pre-order.interface";

type Vista = "urgentes" | "curso" | "completadas";

const isClosed = (p: PreOrderListItem) => p.estatus === "convertida" || p.estatus === "cancelada";
const VISTA_FILTER: Record<Vista, (p: PreOrderListItem) => boolean> = {
  urgentes: (p) => isUrgentPreOrder(p),
  curso: (p) => !isClosed(p),
  completadas: isClosed,
};

const LINK_CLASS =
  "font-mono text-sm font-semibold text-sky-600 dark:text-sky-400 underline decoration-dotted underline-offset-4";

const columnHelper = createColumnHelper<PreOrderListItem>();

/** Ordena rojo → amarillo → verde (lo urgente primero). */
const SEMAFORO_ORDEN: Record<string, number> = { rojo: 0, amarillo: 1, verde: 2 };

const columns = [
  columnHelper.accessor((row) => row.pedido_folio ?? "", {
    id: "pedido_folio",
    header: "Pedido",
    size: 120,
    cell: ({ row }) => (
      <Link href={`/manufacturing/pre-orders/${row.original.id}`} className={LINK_CLASS} title="Ver pre-orden">
        {row.original.pedido_folio || `#${row.original.pedido}`}
      </Link>
    ),
  }),
  columnHelper.accessor((row) => row.cliente_nombre ?? "", {
    id: "cliente_nombre",
    header: "Cliente",
    size: 170,
    cell: ({ row }) => (
      <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
        {textOrDash(row.original.cliente_nombre)}
      </span>
    ),
  }),
  columnHelper.accessor("estatus_display", {
    header: "Seguimiento",
    size: 190,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <PreOrderTrackerMini estatus={row.original.estatus} late={row.original.semaforo === "rojo"} />
        {row.original.regreso && row.original.estatus === "faltan_materiales" && (
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400" title={row.original.regreso.motivo}>
            Regresó: otra OP usó el material
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor((row) => SEMAFORO_ORDEN[row.semaforo ?? ""] ?? 9, {
    id: "semaforo",
    header: "Material",
    size: 110,
    enableGlobalFilter: false,
    sortUndefined: "last",
    cell: ({ row }) =>
      row.original.estatus === "convertida" || row.original.estatus === "cancelada" ? (
        <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
      ) : (
        <SemaforoBadge semaforo={row.original.semaforo} compact />
      ),
  }),
  columnHelper.accessor((row) => row.fecha_compromiso ?? undefined, {
    id: "fecha_compromiso",
    header: "Compromiso",
    size: 110,
    enableGlobalFilter: false,
    sortUndefined: "last",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-slate-700 dark:text-slate-200">
        {formatShortDate(row.original.fecha_compromiso, { timeZone: MEXICO_TIME_ZONE })}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.fecha_estimada_material ?? undefined, {
    id: "fecha_estimada_material",
    header: "Llega material",
    size: 110,
    enableGlobalFilter: false,
    sortUndefined: "last",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-slate-700 dark:text-slate-200">
        {row.original.fecha_estimada_material
          ? formatShortDate(row.original.fecha_estimada_material, { timeZone: MEXICO_TIME_ZONE })
          : "—"}
      </span>
    ),
  }),
  columnHelper.accessor((row) => row.materiales_faltantes, {
    id: "materiales_faltantes",
    header: "Faltan",
    size: 70,
    enableGlobalFilter: false,
    sortUndefined: "last",
    meta: { align: "right" },
    cell: ({ row }) => {
      const n = row.original.materiales_faltantes;
      if (n === undefined) return <span className="text-xs text-slate-400">—</span>;
      return (
        <span className={`tabular-nums text-sm font-semibold ${n > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {n}
        </span>
      );
    },
  }),
  columnHelper.accessor((row) => row.dias_en_estatus, {
    id: "dias_en_estatus",
    header: "Días aquí",
    size: 80,
    enableGlobalFilter: false,
    sortUndefined: "last",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-slate-600 dark:text-slate-300">
        {row.original.dias_en_estatus ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("piezas_total", {
    header: "Piezas",
    size: 75,
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <span className="tabular-nums text-sm">{formatQuantityValue(info.getValue())}</span>,
  }),
  columnHelper.accessor((row) => row.op_folio ?? "", {
    id: "op_folio",
    header: "OP",
    size: 110,
    cell: ({ row }) =>
      row.original.op ? (
        <Link href={`/manufacturing/production-orders/${row.original.op}`} className={LINK_CLASS}>
          {row.original.op_folio || `#${row.original.op}`}
        </Link>
      ) : (
        <span className="text-xs text-slate-400 dark:text-slate-500">Sin OP</span>
      ),
  }),
] as ColumnDef<PreOrderListItem>[];

/**
 * Pre-órdenes de producción: bandeja compartida por almacén (valida
 * existencias), compras (surte faltantes) y producción (crea la OP).
 */
export function PreOrdersView() {
  const { preOrders, hasLoaded, isLoading, isFetching, isInitialError, refetch } = usePreOrders();
  const [vista, setVista] = useState<Vista>("urgentes");
  const count = (v: Vista) => preOrders.filter(VISTA_FILTER[v]).length;
  const rows = preOrders.filter(VISTA_FILTER[vista]);

  return (
    <div className="h-full flex flex-col min-h-0 gap-3">
      <ListTabs
        ariaLabel="Vista de pre-órdenes"
        value={vista}
        onChange={setVista}
        isReady={hasLoaded}
        tabs={[
          { key: "urgentes", label: "Urgentes", count: count("urgentes") },
          { key: "curso", label: "En curso", count: count("curso") },
          { key: "completadas", label: "Completadas", count: count("completadas") },
        ]}
      />
      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={rows}
          paginationResetKey={vista}
          getRowId={(row) => String(row.id)}
          searchPlaceholder="Buscar por pedido o cliente..."
          fillHeight
          onRefetch={refetch}
          isRefetching={isFetching}
          isLoading={isLoading}
          isError={isInitialError}
          errorTitle="No se pudieron cargar las pre-órdenes"
          onErrorRetry={refetch}
          emptyMessage={vista === "urgentes" ? "Nada urgente. Todo va a tiempo." : "No hay pre-órdenes en esta vista."}
        />
      </div>
    </div>
  );
}
