"use client";

import { useState } from "react";
import Link from "next/link";
import { AccessibleLink } from "@/src/components/AccessibleLink";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";
import { useSession } from "next-auth/react";
import { Button } from "@/src/components/Button";
import { hasProductionPermission } from "@/src/utils/productionPermissions";
import { CreateResurtidoDialog } from "./CreateResurtidoDialog";
import { PedidoVinculadoFolio } from "@/src/features/orders/components/PedidoVinculadoFolio";
import { preOrderReference, isResurtido } from "../utils/preOrderOrigin";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/src/components/DataTable";
import { ListTabs } from "@/src/components/ListTabs";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { formatShortCalendarDate } from "@/src/utils/formatDate";
import { usePreOrders } from "../hooks/usePreOrders";
import { SemaforoBadge } from "./PreOrderTracking";
import { isClosedPreOrderStatus } from "../constants/preOrderStatus";
import { isUrgentPreOrder, PreOrderTrackerMini } from "./PreOrderTracker";
import type { PreOrderListItem } from "../interfaces/pre-order.interface";

type Vista = "urgentes" | "curso" | "completadas";

const isClosed = (p: PreOrderListItem) => isClosedPreOrderStatus(p.estatus);
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
  columnHelper.accessor((row) => preOrderReference(row), {
    id: "referencia",
    header: "Origen",
    size: 150,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1 min-w-0">
        <Link href={`/manufacturing/pre-orders/${row.original.id}`} className={`${LINK_CLASS} truncate max-w-full`} title="Ver pre-orden">
          {preOrderReference(row.original)}
        </Link>
        {isResurtido(row.original) && (
          <span className="rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-400">
            Resurtido
          </span>
        )}
        {(row.original.pedidos_vinculados?.length ?? 0) > 0 && (
          <span className="flex flex-wrap gap-x-2 text-[11px]" title="Pedidos ligados">
            {row.original.pedidos_vinculados!.slice(0, 2).map((p) => (
              <span key={p.id} className="font-mono text-[11px]"><PedidoVinculadoFolio pedidoVinculado={{ id: p.id, folio: p.folio || `#${p.id}` }} pedidoFolio={p.folio} from="pre-orders" /></span>
            ))}
            {row.original.pedidos_vinculados!.length > 2 && (
              <span className="text-slate-400">+{row.original.pedidos_vinculados!.length - 2}</span>
            )}
          </span>
        )}
      </div>
    ),
  }),
  columnHelper.accessor((row) => row.cliente_nombre ?? "", {
    id: "cliente_nombre",
    header: "Cliente",
    size: 170,
    cell: ({ row }) => (
      <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2">
        {row.original.cliente_nombre
          ? row.original.cliente_nombre
          : (row.original.pedidos_vinculados?.length ?? 0) > 0
            ? [...new Set(row.original.pedidos_vinculados!.map((p) => p.cliente_nombre).filter(Boolean))].join(", ") || "—"
            : isResurtido(row.original)
              ? "Stock interno"
              : textOrDash(row.original.cliente_nombre)}
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
      isClosedPreOrderStatus(row.original.estatus) ? (
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
        {formatShortCalendarDate(row.original.fecha_compromiso)}
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
          ? formatShortCalendarDate(row.original.fecha_estimada_material)
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
        // Sin `R-PRODUCCION-OP` (la regla de la ruta), folio sin enlace (EC-895).
        <AccessibleLink
          href={productionOrderDetailPath(row.original.op)}
          className={LINK_CLASS}
          fallbackClassName="font-mono text-xs text-slate-600 dark:text-slate-300"
        >
          {row.original.op_folio || `#${row.original.op}`}
        </AccessibleLink>
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
  const [vista, setVista] = useState<Vista>("curso");
  const [createOpen, setCreateOpen] = useState(false);
  const { data: session } = useSession();
  // Mismo permiso que el backend exige para el alta de resurtido.
  const canCreate = hasProductionPermission(session?.user, "OP", "C");
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
          searchPlaceholder="Buscar por pedido, SKU o cliente..."
          actionButton={
            canCreate ? (
              <Button variant="primary" rounded="full" onClick={() => setCreateOpen(true)}>
                + Generar pre-orden
              </Button>
            ) : undefined
          }
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
      <CreateResurtidoDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
