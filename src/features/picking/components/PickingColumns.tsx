"use client";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ChevronRightIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  PEDIDO_PROGRAMACION_DESTINOS,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
} from "@/src/features/orders/constants/pedidoProgramacion";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { formatDeadlineText } from "@/src/utils/formatDeadlineText";
import { formatShortCalendarDate, formatShortDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM, MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { PICKING_EMPAQUE_CONFIG } from "../constants/pickingEmpaque";
import { destinoTone } from "../constants/pickingDestinoTone";
import { PICKING_STATUS_CONFIG } from "../constants/pickingStatus";
import {
  PICKING_EMPAQUE_VALUES,
  PICKING_ENTREGA_LABELS,
  PICKING_ENTREGA_VALUES,
  PICKING_ESTADO_VALUES,
  PICKING_PERIODO_LABELS,
  PICKING_PERIODO_VALUES,
} from "../constants/pickingsTable";
import type { PickingListItem } from "../interfaces/picking.interface";
import { usePickingsFiltros } from "../hooks/usePickingsTable";
import { getProgramacionDestinoLabel } from "../utils/pickingDestino";
import { urgenciaEntrega } from "../utils/pickingListado";

/**
 * Callbacks de la tabla. El diálogo de detalle NO vive en la celda (las celdas
 * se desmontan al ordenar, filtrar, paginar o refrescar): lo monta `PickingView`.
 */
export interface PickingColumnsCallbacks {
  onViewDetail: (pickingId: number) => void;
}

type PickingColumn = Column<PickingListItem, unknown>;

const miles = (n: number) => n.toLocaleString("es-MX", { maximumFractionDigits: 4 });

export const pickingDestinoLabel = (row: Pick<PickingListItem, "programacion_destino">): string =>
  row.programacion_destino ? getProgramacionDestinoLabel(row.programacion_destino) : "Sin programación";

const iniciales = (nombre: string) =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// ── Opciones FIJAS de los filtros de encabezado (nunca de las filas: la tabla
//    solo tiene la página actual) ───────────────────────────────────────────

const PERIODO_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PICKING_PERIODO_VALUES.map((v) => ({ value: v, label: PICKING_PERIODO_LABELS[v] })),
];
const ENTREGA_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PICKING_ENTREGA_VALUES.map((v) => ({ value: v, label: PICKING_ENTREGA_LABELS[v] })),
];
const DESTINO_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PEDIDO_PROGRAMACION_DESTINOS.map((v) => ({
    value: v,
    label: PEDIDO_PROGRAMACION_DESTINO_LABELS[v],
    dotClassName: destinoTone(v).bar,
  })),
];
const EMPAQUE_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PICKING_EMPAQUE_VALUES.map((v) => ({
    value: v,
    label: PICKING_EMPAQUE_CONFIG[v].label,
    dotClassName: PICKING_EMPAQUE_CONFIG[v].dot,
  })),
];
const ESTADO_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PICKING_ESTADO_VALUES.map((v) => ({
    value: v,
    label: PICKING_STATUS_CONFIG[v].label ?? v,
    dotClassName: PICKING_STATUS_CONFIG[v].dot,
  })),
];

function FixedHeader({
  column,
  title,
  label,
  options,
  menuAlign,
}: {
  column: PickingColumn;
  title: string;
  label: string;
  options: ColumnFilterOption[];
  menuAlign?: "start" | "end";
}) {
  return <FilterHeader title={title} column={column} options={options} label={label} menuAlign={menuAlign} />;
}

/** Clientes / operadores que tienen surtidos (`/wms/pickings/filtros/`), con buscador. */
function CatalogoHeader({
  column,
  title,
  catalogo,
  label,
  menuAlign,
}: {
  column: PickingColumn;
  title: string;
  catalogo: "clientes" | "operadores";
  label: string;
  menuAlign?: "start" | "end";
}) {
  const { data, isLoading, isInitialError } = usePickingsFiltros();
  const options: ColumnFilterOption[] = [
    ALL_FILTER_OPTION,
    ...(data?.[catalogo] ?? []).map((o) => ({ value: String(o.id), label: o.nombre })),
  ];
  return (
    <FilterHeader
      title={title}
      column={column}
      options={options}
      label={label}
      searchable={{ placeholder: `Buscar ${label}…` }}
      isLoading={isLoading}
      isError={isInitialError}
      menuAlign={menuAlign}
    />
  );
}

/**
 * Columnas del listado de surtidos en MODO SERVIDOR: `meta.serverSort` es el
 * campo de `ordering` (lista blanca en `pickingsTable`) y `meta.serverFilter`
 * la clave del filtro. Sin columna de acciones: el detalle se abre desde el
 * folio (botón con "›"). `hoy` ("AAAA-MM-DD", el día de México que reporta el
 * backend) mide la urgencia de la entrega; vacío, no se marca urgencia.
 */
export const getPickingColumns = (
  { onViewDetail }: PickingColumnsCallbacks,
  hoy: string,
): ColumnDef<PickingListItem, unknown>[] => [
  {
    id: "folio",
    accessorKey: "folio",
    size: 150,
    meta: { label: "Surtido", serverSort: "created_at", serverFilter: "periodo" },
    header: ({ column }) => <FixedHeader column={column} title="Surtido" label="periodo" options={PERIODO_OPTIONS} />,
    cell: ({ row }) => (
      <span className="flex flex-col items-start leading-tight">
        <button
          type="button"
          onClick={() => onViewDetail(row.original.id)}
          title="Ver detalle"
          className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer whitespace-nowrap"
        >
          {row.original.folio || `#${row.original.id}`}
          <ChevronRightIcon
            aria-hidden="true"
            className="h-3.5 w-3.5 text-sky-500/70 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-500"
          />
        </button>
        <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatShortDate(row.original.created_at, { timeZone: MEXICO_TIME_ZONE })}
          {" · "}
          {getMexicoTimeHHMM(row.original.created_at)}
        </span>
      </span>
    ),
  },
  {
    // Pedido + cliente: el cliente es lo que el almacén reconoce.
    id: "cliente",
    accessorKey: "cliente_nombre",
    size: 200,
    meta: { label: "Pedido / Cliente", serverFilter: "cliente" },
    header: ({ column }) => (
      <CatalogoHeader column={column} title="Pedido / Cliente" catalogo="clientes" label="cliente" />
    ),
    cell: ({ row }) => {
      const cliente = row.original.cliente_nombre?.trim() || row.original.pedido_vinculado?.cliente?.nombre || "";
      return (
        <span className="flex min-w-0 flex-col leading-tight">
          <PedidoFolioLink
            pedidoId={row.original.pedido}
            folio={row.original.pedido_folio}
            from="picking"
            className="font-mono text-xs font-semibold"
          />
          <span className="max-w-52 truncate text-sm text-slate-700 dark:text-slate-200" title={cliente}>
            {cliente || "—"}
          </span>
        </span>
      );
    },
  },
  {
    id: "entrega",
    accessorKey: "pedido_fecha_entrega",
    size: 130,
    meta: { label: "Entrega", serverSort: "pedido_fecha_entrega", serverFilter: "entrega" },
    header: ({ column }) => <FixedHeader column={column} title="Entrega" label="entrega" options={ENTREGA_OPTIONS} />,
    cell: ({ row }) => <EntregaCell row={row.original} hoy={hoy} />,
  },
  {
    // A qué programación abona y cómo va ese destino en el pedido.
    id: "destino",
    accessorKey: "programacion_destino",
    size: 140,
    meta: { label: "Para", serverFilter: "programacion_destino" },
    header: ({ column }) => <FixedHeader column={column} title="Para" label="destino" options={DESTINO_OPTIONS} />,
    cell: ({ row }) => <ParaCell row={row.original} />,
  },
  {
    // Dónde están HOY las prendas (lo resuelve el backend) y con qué traspaso llegaron.
    id: "ubicacion",
    accessorKey: "almacen_actual_nombre",
    size: 170,
    meta: { label: "Están en" },
    header: "Están en",
    cell: ({ row }) => {
      const { almacen_actual_nombre, almacen_nombre, transferencia_folio } = row.original;
      const desde = almacen_nombre && almacen_nombre !== almacen_actual_nombre ? almacen_nombre : null;
      return (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
            {almacen_actual_nombre || "—"}
          </span>
          <span
            className="block max-w-44 truncate text-[11px] text-slate-500 dark:text-slate-400"
            title={[transferencia_folio, desde && `desde ${desde}`].filter(Boolean).join(" · ")}
          >
            {transferencia_folio && <span className="font-mono">{transferencia_folio}</span>}
            {desde && transferencia_folio && " · "}
            {desde && <>desde {desde}</>}
          </span>
        </span>
      );
    },
  },
  {
    id: "contenido",
    accessorKey: "piezas",
    size: 130,
    meta: { label: "Contenido", align: "right", serverSort: "piezas" },
    header: "Contenido",
    cell: ({ row }) => {
      const { piezas, productos, tallas } = row.original;
      return (
        <span className="flex flex-col items-end leading-tight tabular-nums">
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {miles(Number(piezas) || 0)} <span className="text-[11px] font-normal text-slate-400">pzas</span>
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {productos} {productos === 1 ? "producto" : "productos"} · {tallas} {tallas === 1 ? "talla" : "tallas"}
          </span>
        </span>
      );
    },
  },
  {
    id: "empaque",
    accessorKey: "estado_empaque",
    size: 140,
    meta: { label: "Empaque", serverSort: "estado_empaque", serverFilter: "estado_empaque" },
    header: ({ column }) => <FixedHeader column={column} title="Empaque" label="empaque" options={EMPAQUE_OPTIONS} />,
    cell: ({ row }) => <EmpaqueCell row={row.original} />,
  },
  {
    id: "estado",
    accessorKey: "estado",
    size: 130,
    meta: { label: "Estatus", align: "center", serverFilter: "estado" },
    header: ({ column }) => (
      <FixedHeader column={column} title="Estatus" label="estatus" options={ESTADO_OPTIONS} menuAlign="end" />
    ),
    cell: (info) => (
      <div className="flex justify-center">
        <StatusBadge status={String(info.getValue())} config={PICKING_STATUS_CONFIG} />
      </div>
    ),
  },
  {
    id: "operador",
    accessorKey: "operador_nombre",
    size: 180,
    meta: { label: "Surtió", serverFilter: "operador" },
    header: ({ column }) => (
      <CatalogoHeader column={column} title="Surtió" catalogo="operadores" label="operador" menuAlign="end" />
    ),
    cell: ({ row }) => {
      const nombre = row.original.operador_nombre || "—";
      return (
        <span className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-300"
          >
            {iniciales(nombre)}
          </span>
          <span className="max-w-36 truncate text-xs font-medium text-slate-600 dark:text-slate-300" title={nombre}>
            {nombre}
          </span>
        </span>
      );
    },
  },
];

function ParaCell({ row }: { row: PickingListItem }) {
  const tone = destinoTone(row.programacion_destino);
  // Números a prueba de `null`: un surtido viejo sin destino programado trae `cantidad: null`.
  const cantidad = Number(row.programacion_avance?.cantidad) || 0;
  const surtido = Number(row.programacion_avance?.surtido) || 0;
  const conAvance = cantidad > 0;
  const pct = conAvance ? Math.min(100, (surtido / cantidad) * 100) : 0;
  const cubierto = conAvance && surtido >= cantidad;
  return (
    <span className="flex flex-col items-start gap-1 leading-tight">
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${tone.badge}`}
      >
        {pickingDestinoLabel(row)}
      </span>
      {conAvance && (
        <span
          className="flex items-center gap-1.5"
          title={`Programado para ${pickingDestinoLabel(row)}: ${miles(cantidad)} pzas · surtido ${miles(surtido)}`}
        >
          <span className="h-1 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <span className={`block h-full ${cubierto ? "bg-emerald-500" : tone.bar}`} style={{ width: `${pct}%` }} />
          </span>
          <span className="text-[10px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {cubierto ? "✓ " : ""}
            {miles(surtido)}/{miles(cantidad)}
          </span>
        </span>
      )}
    </span>
  );
}

const URGENCIA_CLS = {
  vencida: "text-rose-600 dark:text-rose-400",
  pronto: "text-amber-600 dark:text-amber-400",
  normal: "text-slate-500 dark:text-slate-400",
  sin: "text-slate-400",
} as const;

function EntregaCell({ row, hoy }: { row: PickingListItem; hoy: string }) {
  const { urgencia, dias } = urgenciaEntrega(row, hoy);
  if (urgencia === "sin") return <span className="text-xs text-slate-400">Sin fecha</span>;
  // Solo si ya venció o vence en los próximos días ("pronto"); "vencida" por la entrega.
  const detalle =
    dias !== null && (urgencia === "vencida" || urgencia === "pronto")
      ? formatDeadlineText(dias, { gender: "f" })
      : "";
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {formatShortCalendarDate(row.pedido_fecha_entrega)}
      </span>
      {detalle && <span className={`text-[11px] font-semibold ${URGENCIA_CLS[urgencia]}`}>{detalle}</span>}
    </span>
  );
}

function EmpaqueCell({ row }: { row: PickingListItem }) {
  // Un surtido cancelado no espera embarque, aunque el backend lo cuente como POR_EMPACAR.
  if (!row.estado_empaque || (row.estado === "Cancelado" && row.estado_empaque === "POR_EMPACAR")) {
    return <span className="text-xs text-slate-400">—</span>;
  }
  const cfg = PICKING_EMPAQUE_CONFIG[row.estado_empaque];
  const packings = row.packings ?? [];
  const extra = packings.length > 1 ? packings.length - 1 : 0;
  return (
    <span className="flex flex-col items-start gap-0.5 leading-tight">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${cfg?.cls ?? ""}`}
      >
        <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${cfg?.dot ?? "bg-slate-400"}`} />
        {cfg?.label ?? row.estado_empaque}
      </span>
      {row.packing_folio && (
        <span
          className="font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap"
          title={packings.map((p) => `${p.folio}${p.despachado ? " · enviado" : ""}`).join("\n")}
        >
          {row.packing_folio}
          {extra > 0 && <span className="font-sans"> +{extra}</span>}
        </span>
      )}
    </span>
  );
}
