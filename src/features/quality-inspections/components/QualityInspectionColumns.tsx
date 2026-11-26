"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { FolioButton } from "@/src/components/FolioButton";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { formatLocalDate } from "@/src/utils/formatDate";
import { QUALITY_TIPO_ORIGEN_CFG } from "../constants/qualityResultado";
import Link from "next/link";
import { DropdownMenu } from "@radix-ui/themes";
import { pedidoDetailHref } from "@/src/features/orders/constants/pedidoDetailOrigins";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import type { QualityInspection, QualityPedidoRef, QualityPendingReception } from "../interfaces/quality-inspection.interface";

/**
 * Fila plana: los filtros de chips (`filterConfig`) comparan `row[campo]`, así
 * que origen y almacén se resuelven aquí (del listado de recepciones, que sí
 * los trae) y no dentro de la celda.
 */
export interface QualityPendingRow {
  reception: QualityPendingReception;
  id: number;
  folio: string;
  /** Folios de pedido unidos, para buscar y filtrar. */
  pedido: string;
  pedidos: QualityPedidoRef[];
  tipo_origen: string;
  proveedor_nombre: string;
  /** Folio de lo que originó la recepción: OC, OP o SM. */
  origen: string;
  almacen: string;
  fecha_recepcion: string;
  piezas: number;
  renglones: number;
}

export interface QualityDoneRow {
  inspection: QualityInspection;
  id: number;
  recepcion_folio: string;
  pedido: string;
  pedidos: QualityPedidoRef[];
  tipo_origen: string;
  origen: string;
  proveedor_nombre: string;
  inspector: string;
  fecha: string;
  estado: string;
  aprobadas: number;
  rechazadas: number;
}

const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 2 });


/** Pedido(s) maestro(s): el principal enlazado al 360°; los demás, como "+N". */
const PedidoCell = ({ pedidos }: { pedidos: QualityPedidoRef[] }) => {
  if (pedidos.length === 0) return <span className="text-xs text-slate-400" title="El origen no está ligado a un pedido">Sin pedido</span>;
  const [principal, ...resto] = pedidos;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <PedidoFolioLink pedidoId={principal.id} folio={principal.folio} from="quality" className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-200" />
      {resto.length > 0 && (
        // No modal: ver `ActionMenu` (radix-ui/primitives#3317).
        <DropdownMenu.Root modal={false}>
          <DropdownMenu.Trigger>
            <button
              type="button"
              aria-label={`Ver los ${pedidos.length} pedidos`}
              title="Ver todos los pedidos"
              className="rounded-full bg-sky-50 dark:bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 cursor-pointer"
            >
              +{resto.length}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            align="start"
            className="bg-white! dark:bg-zinc-900! min-w-44 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 z-50 p-1"
          >
            <DropdownMenu.Label className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Pedidos de esta recepción
            </DropdownMenu.Label>
            {pedidos.map((p, i) => (
              <DropdownMenu.Item key={p.id} asChild>
                <Link
                  href={pedidoDetailHref(p.id, "quality")}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 font-mono text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-sky-50 dark:hover:bg-white/5 hover:text-sky-600 cursor-pointer"
                >
                  {p.folio ?? `#${p.id}`}
                  {i === 0 && <span className="font-sans text-[10px] font-normal text-slate-400">principal</span>}
                </Link>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      )}
    </span>
  );
};

const OrigenCell = ({ tipo, origen }: { tipo: string; origen: string }) => (
  <span className="flex flex-col items-start gap-1">
    <span className="whitespace-nowrap font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
      {textOrDash(origen)}
    </span>
    <StatusBadge status={tipo} config={QUALITY_TIPO_ORIGEN_CFG} />
  </span>
);

/** Proveedor arriba y almacén debajo: una sola columna para "de quién / a dónde". */
const ProveedorAlmacen = ({ proveedor, almacen }: { proveedor: string; almacen?: string }) => (
  <span className="flex flex-col">
    <span className="max-w-56 truncate text-slate-700 dark:text-slate-200" title={proveedor || undefined}>
      {proveedor || <span className="text-slate-400">Interno</span>}
    </span>
    {almacen !== undefined && <span className="text-[11px] text-slate-400">{textOrDash(almacen)}</span>}
  </span>
);

const pendingHelper = createColumnHelper<QualityPendingRow>();

export const getQualityPendingColumns = ({ onInspect }: { onInspect: (r: QualityPendingReception) => void }) =>
  [
    // Sin columna de acciones: el folio es la acción (abre la inspección).
    pendingHelper.accessor("folio", {
      header: "Recepción",
      cell: ({ row, getValue }) => (
        <span className="flex flex-col items-start gap-0.5">
          <FolioButton folio={getValue()} title="Inspeccionar" onClick={() => onInspect(row.original.reception)} />
          <span className="text-[11px] tabular-nums text-slate-400">Recibida {formatLocalDate(row.original.fecha_recepcion)}</span>
        </span>
      ),
    }),
    pendingHelper.accessor("pedido", {
      header: "Pedido",
      cell: ({ row }) => <PedidoCell pedidos={row.original.pedidos} />,
    }),
    pendingHelper.accessor("origen", {
      header: "Origen",
      cell: ({ row }) => <OrigenCell tipo={row.original.tipo_origen} origen={row.original.origen} />,
    }),
    pendingHelper.accessor("proveedor_nombre", {
      header: "Proveedor / Almacén",
      cell: ({ row }) => <ProveedorAlmacen proveedor={row.original.proveedor_nombre} almacen={row.original.almacen} />,
    }),
    pendingHelper.accessor("piezas", {
      header: "Piezas",
      meta: { align: "right" },
      cell: ({ row, getValue }) => (
        <span className="tabular-nums">
          <b className="text-slate-800 dark:text-slate-100">{miles(getValue())}</b>
          <span className="block text-[11px] text-slate-400">
            {row.original.renglones} {row.original.renglones === 1 ? "producto" : "productos"}
          </span>
        </span>
      ),
    }),
  ] as ColumnDef<QualityPendingRow>[];

export const QUALITY_ESTADO_CFG: Record<string, StatusBadgeConfigEntry> = {
  aprobada: { cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300", dot: "bg-emerald-500", label: "Aprobada" },
  aprobada_condicion: { cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300", dot: "bg-amber-500", label: "Aprobada con condición" },
  rechazada: { cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300", dot: "bg-rose-500", label: "Rechazada" },
  pendiente: { cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300", dot: "bg-slate-400", label: "Pendiente" },
  // EC-947: revertida por un admin; lo liberado salió del almacén.
  anulada: { cls: "bg-zinc-100 text-zinc-600 dark:bg-zinc-500/10 dark:text-zinc-400", dot: "bg-zinc-400", label: "Anulada" },
};

const doneHelper = createColumnHelper<QualityDoneRow>();

export const getQualityDoneColumns = ({ onOpen }: { onOpen: (i: QualityInspection) => void }) =>
  [
    doneHelper.accessor("recepcion_folio", {
      header: "Recepción",
      cell: ({ row, getValue }) => (
        <span className="flex flex-col items-start gap-0.5">
          <FolioButton folio={getValue()} title="Ver inspección" onClick={() => onOpen(row.original.inspection)} />
          <span className="text-[11px] tabular-nums text-slate-400">Inspeccionada {formatLocalDate(row.original.fecha)}</span>
        </span>
      ),
    }),
    doneHelper.accessor("pedido", {
      header: "Pedido",
      cell: ({ row }) => <PedidoCell pedidos={row.original.pedidos} />,
    }),
    doneHelper.accessor("origen", {
      header: "Origen",
      cell: ({ row }) => <OrigenCell tipo={row.original.tipo_origen} origen={row.original.origen} />,
    }),
    doneHelper.accessor("proveedor_nombre", {
      header: "Proveedor",
      cell: ({ row }) => <ProveedorAlmacen proveedor={row.original.proveedor_nombre} />,
    }),
    doneHelper.accessor("estado", {
      header: "Resultado",
      meta: { align: "center" },
      cell: ({ row, getValue }) => (
        <span className="inline-flex flex-col items-center gap-1">
          <StatusBadge status={getValue()} config={QUALITY_ESTADO_CFG} />
          {/* EC-951: algo rechazado o en cuarentena aún sin devolver al proveedor. */}
          {row.original.inspection.tiene_devolucion_pendiente === true && (
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-none whitespace-nowrap bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              title="Tiene rechazo o cuarentena pendiente de devolver al proveedor"
            >
              Por devolver
            </span>
          )}
        </span>
      ),
    }),
    doneHelper.accessor("aprobadas", {
      header: "Aprobadas",
      meta: { align: "right" },
      cell: (info) => (
        <span className="tabular-nums font-semibold text-emerald-700 dark:text-emerald-300">{miles(info.getValue())}</span>
      ),
    }),
    doneHelper.accessor("rechazadas", {
      header: "Rechazadas",
      meta: { align: "right" },
      cell: (info) => (
        <span className={`tabular-nums font-semibold ${info.getValue() > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
          {miles(info.getValue())}
        </span>
      ),
    }),
    doneHelper.accessor("inspector", {
      header: "Inspector",
      cell: (info) => <span className="text-slate-600 dark:text-slate-300">{textOrDash(info.getValue())}</span>,
    }),
  ] as ColumnDef<QualityDoneRow>[];
