"use client";

import { type ColumnDef, type FilterFn, type SortingFn } from "@tanstack/react-table";
import { Popover } from "@radix-ui/themes";
import {
  ColumnHeaderFilter,
  FilterHeader,
  type ColumnFilterOption,
} from "@/src/components/ColumnHeaderFilter";
import { ChevronRightIcon } from "@/src/components/Icons";
import {
  ALL_FILTER_OPTION,
  buildDistinctFilterOptions,
  buildMonthFilterOptions,
  matchesMonthFilter,
  matchesRangeFilter,
  type RangeFilterOption,
} from "@/src/utils/columnFilterOptions";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatOrderAmountOrDash } from "@/src/features/orders/utils/orderAmountFormat";
import { formatPiezas } from "@/src/utils/formatWorkOrderProgramado";
import { formatEntregaEstimada, hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusConfig,
  PEDIDO_ESTATUS_CONFIG,
} from "@/src/features/orders/constants/pedidoStatus";
import {
  getPedidoProgramacionDestinoLabel,
  PEDIDO_PROGRAMACION_DESTINOS,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
} from "@/src/features/orders/constants/pedidoProgramacion";
import type { ScheduledParcialidadRow } from "../interfaces/scheduled-parcialidad.interface";

/**
 * Columnas de "Pedidos programados" (Mesa de Control, SOLO LECTURA): UNA FILA
 * POR PARCIALIDAD (`flattenScheduledParcialidades`). Las columnas del pedido
 * (folio, cliente, estatus, entrega…) se repiten en cada parcialidad del mismo
 * folio; "Parcialidad", "Destino", "Cantidad" y "Comentarios" son de la fila.
 *
 * El folio abre directamente el detalle 360° (`PedidoFolioLink`,
 * `?from=scheduled-orders` para que el "Volver" regrese a esta lista y no a
 * "Pedidos").
 *
 * Búsqueda global: solo participan las columnas con texto que el usuario
 * teclea (folio + OC, destino, comentarios, razón social). Las que exponen un
 * código crudo, una fecha ISO, un número o milisegundos se excluyen con
 * `enableGlobalFilter: false`.
 */

/**
 * Piezas de la parcialidad como número, o `undefined` si falta o no es
 * numérica (`cantidad` viene de un `JSONField`).
 */
const getCantidadValue = (cantidad: unknown): number | undefined => {
  const value =
    typeof cantidad === "number"
      ? cantidad
      : typeof cantidad === "string" && cantidad.trim() !== ""
        ? Number(cantidad)
        : NaN;
  return Number.isFinite(value) ? value : undefined;
};

/** Comentario de la parcialidad, o `null` si está vacío o solo trae espacios. */
const getComentarios = (row: ScheduledParcialidadRow): string | null =>
  row.comentarios.trim() ? row.comentarios : null;

const getDestinoLabel = (row: ScheduledParcialidadRow): string =>
  getPedidoProgramacionDestinoLabel(String(row.destino));

/**
 * Comentario en una línea truncada; el clic abre el texto completo en un
 * `Popover` de Radix Themes (mismo recurso que `ReflectiveLineConfigPopover`).
 * Sin autor ni fecha: el backend re-sella ambos en todas las entradas en cada
 * guardado, así que no son del comentario.
 */
function ProgramacionComentariosPopover({
  comentarios,
  destinoLabel,
}: {
  comentarios: string;
  destinoLabel: string;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <button
          type="button"
          aria-label={`Comentario de ${destinoLabel}: ${comentarios}`}
          title={comentarios}
          className="block max-w-full truncate rounded text-left text-sm text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {comentarios}
        </button>
      </Popover.Trigger>
      <Popover.Content size="1" width="300px" side="top" align="start">
        <p className="pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Comentarios · {destinoLabel}
        </p>
        <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">
          {comentarios}
        </p>
      </Popover.Content>
    </Popover.Root>
  );
}

const DESTINO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...PEDIDO_PROGRAMACION_DESTINOS.map((destino) => ({
    value: destino,
    label: PEDIDO_PROGRAMACION_DESTINO_LABELS[destino],
  })),
];

/** Coincide la PARCIALIDAD cuyo destino es el filtrado (no el pedido completo). */
const destinoFilterFn: FilterFn<ScheduledParcialidadRow> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  return row.original.destino === filterValue;
};

/**
 * Orden de "Folio" solo por el folio (no por la cadena folio + OC del
 * accessor), con los folios vacíos al final en orden ascendente. TanStack
 * invierte el resultado en descendente, así que ahí quedan al principio.
 */
const folioSortingFn: SortingFn<ScheduledParcialidadRow> = (rowA, rowB) => {
  const folioA = rowA.original.folio?.trim() ?? "";
  const folioB = rowB.original.folio?.trim() ?? "";
  if (!folioA || !folioB) return Number(!folioA) - Number(!folioB);
  return folioA.localeCompare(folioB, "es", { numeric: true });
};

const DASH = <span className="text-slate-400 dark:text-slate-600">—</span>;

// ─── Filtros de encabezado ────────────────────────────────────────────────────
// Toda la lista está en memoria: las opciones de cliente, clasificación y los
// meses salen de las filas (`buildScheduledOrderFilterOptions`); cantidad e
// importe usan rangos fijos. El estatus del pedido ya no tiene columna propia:
// va junto al folio y se filtra desde su encabezado.

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...Object.entries(PEDIDO_ESTATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label })),
];

const PARCIALIDAD_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  { value: "unica", label: "Entrega única" },
  { value: "varias", label: "Varias parcialidades" },
];

const COMENTARIOS_FILTER_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  { value: "con", label: "Con comentario" },
  { value: "sin", label: "Sin comentario" },
];

const CANTIDAD_RANGES: RangeFilterOption[] = [
  { value: "1-50", label: "1 a 50 piezas", max: 51 },
  { value: "51-500", label: "51 a 500 piezas", min: 51, max: 501 },
  { value: "mas-500", label: "Más de 500 piezas", min: 501 },
];

const IMPORTE_RANGES: RangeFilterOption[] = [
  { value: "hasta-10k", label: "Hasta 10,000", max: 10_000 },
  { value: "10k-100k", label: "10,000 – 100,000", min: 10_000, max: 100_000 },
  { value: "mas-100k", label: "Más de 100,000", min: 100_000 },
];

const rangeOptions = (ranges: RangeFilterOption[]): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  ...ranges.map(({ value, label }) => ({ value, label })),
];

export interface ScheduledOrderFilterOptions {
  clientes: ColumnFilterOption[];
  clasificaciones: ColumnFilterOption[];
  mesesEntrega: ColumnFilterOption[];
  mesesProgramacion: ColumnFilterOption[];
  meses: ColumnFilterOption[];
}

export function buildScheduledOrderFilterOptions(
  rows: ScheduledParcialidadRow[],
): ScheduledOrderFilterOptions {
  return {
    clientes: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(rows, (r) => r.cliente_razon_social),
    ],
    clasificaciones: [
      ALL_FILTER_OPTION,
      ...buildDistinctFilterOptions(
        rows,
        (r) => r.clasificacion,
        (r) => getPedidoClasificacionLabel(r.clasificacion),
      ),
    ],
    mesesEntrega: [
      ALL_FILTER_OPTION,
      ...buildMonthFilterOptions(rows.map((r) => r.fecha_entrega_min), "Sin fecha de entrega"),
    ],
    mesesProgramacion: [
      ALL_FILTER_OPTION,
      ...buildMonthFilterOptions(rows.map((r) => r.ultimaProgramacion?.fecha), "Sin guardar"),
    ],
    meses: [ALL_FILTER_OPTION, ...buildMonthFilterOptions(rows.map((r) => r.created_at))],
  };
}

const EMPTY_FILTER_OPTIONS: ScheduledOrderFilterOptions = {
  clientes: [ALL_FILTER_OPTION],
  clasificaciones: [ALL_FILTER_OPTION],
  mesesEntrega: [ALL_FILTER_OPTION],
  mesesProgramacion: [ALL_FILTER_OPTION],
  meses: [ALL_FILTER_OPTION],
};

export function getScheduledOrderColumns(
  filterOptions: ScheduledOrderFilterOptions = EMPTY_FILTER_OPTIONS,
): ColumnDef<ScheduledParcialidadRow, unknown>[] {
  return [
    {
      id: "folio",
      header: ({ column }) => (
        <FilterHeader
          title="Folio"
          column={column}
          options={ESTATUS_FILTER_OPTIONS}
          label="estatus del pedido"
        />
      ),
      meta: { label: "Folio" },
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || String(row.original.estatus) === filterValue,
      // Folio + OC: alimenta la búsqueda global con ambos (la OC no tiene
      // columna propia). El orden NO usa esa cadena: `folioSortingFn` compara
      // solo el folio.
      accessorFn: (row) =>
        [row.folio ?? "", hasMeaningfulOc(row.oc) ? row.oc : ""].join(" ").trim(),
      sortingFn: folioSortingFn,
      size: 230,
      cell: ({ row }) => {
        const parcialidad = row.original;
        // Estatus del pedido junto al folio (antes tenía columna propia).
        const estatus = getPedidoEstatusConfig(parcialidad.estatus);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            <PedidoFolioLink
              pedidoId={parcialidad.pedidoId}
              folio={parcialidad.folio}
              from="scheduled-orders"
              className="group inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-800 dark:text-white"
            >
              <ChevronRightIcon
                className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
                aria-hidden="true"
              />
            </PedidoFolioLink>
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none whitespace-nowrap ${estatus.className}`}
            >
              {estatus.label}
            </span>
            {hasMeaningfulOc(parcialidad.oc) && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono"
                title={`Orden de compra: ${parcialidad.oc}`}
              >
                OC {parcialidad.oc}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "parcialidad",
      header: ({ column }) => (
        <FilterHeader
          title="Parcialidad"
          column={column}
          options={PARCIALIDAD_FILTER_OPTIONS}
          label="parcialidades"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue ||
        (filterValue === "unica"
          ? row.original.totalParcialidades === 1
          : row.original.totalParcialidades > 1),
      accessorFn: (row) => row.indice,
      // Sin orden propio: ordenar por índice mezclaría las "1 de N" de todos
      // los pedidos. Ordenar por Folio ya deja cada pedido junto y en orden.
      enableSorting: false,
      enableGlobalFilter: false,
      meta: { align: "center", label: "Parcialidad" },
      size: 140,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {row.original.indice + 1} de {row.original.totalParcialidades}
        </span>
      ),
    },
    {
      id: "destino",
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Destino</span>
          <ColumnHeaderFilter column={column} options={DESTINO_FILTER_OPTIONS} label="destino" />
        </div>
      ),
      meta: { label: "Destino" },
      // El accessor (etiqueta visible) alimenta búsqueda y orden; el filtro
      // compara el CÓDIGO de `row.original` (`destinoFilterFn`).
      accessorFn: getDestinoLabel,
      filterFn: destinoFilterFn,
      size: 160,
      cell: ({ row }) => (
        <span className="text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {getDestinoLabel(row.original)}
        </span>
      ),
    },
    {
      id: "cantidad",
      header: ({ column }) => (
        <FilterHeader
          title="Cantidad"
          column={column}
          options={rangeOptions(CANTIDAD_RANGES)}
          label="rango de cantidad"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesRangeFilter(CANTIDAD_RANGES, getCantidadValue(row.original.cantidad), filterValue),
      accessorFn: (row) => getCantidadValue(row.cantidad),
      sortingFn: "basic",
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { align: "right", label: "Cantidad" },
      size: 130,
      cell: ({ row }) => {
        const cantidad = getCantidadValue(row.original.cantidad);
        return cantidad === undefined ? (
          DASH
        ) : (
          <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
            {formatPiezas(cantidad)}
          </span>
        );
      },
    },
    {
      id: "comentarios",
      meta: { label: "Comentarios" },
      header: ({ column }) => (
        <FilterHeader
          title="Comentarios"
          column={column}
          options={COMENTARIOS_FILTER_OPTIONS}
          label="comentarios"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || (filterValue === "con") === Boolean(getComentarios(row.original)),
      accessorKey: "comentarios",
      enableSorting: false,
      size: 240,
      cell: ({ row }) => {
        const comentarios = getComentarios(row.original);
        if (!comentarios) return DASH;
        return (
          <ProgramacionComentariosPopover
            comentarios={comentarios}
            destinoLabel={getDestinoLabel(row.original)}
          />
        );
      },
    },
    {
      id: "razon_social",
      // Siempre string: TanStack decide si una columna entra a la búsqueda
      // global por el tipo de su valor en la PRIMERA fila, y un `null` ahí la
      // dejaría fuera para todas.
      accessorFn: (row) => row.cliente_razon_social ?? "",
      meta: { label: "Razón social" },
      size: 220,
      header: ({ column }) => (
        <FilterHeader
          title="Razón social"
          column={column}
          options={filterOptions.clientes}
          label="razón social"
          searchable={{ placeholder: "Buscar cliente…" }}
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.cliente_razon_social === filterValue,
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-55">
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      id: "entrega",
      meta: { label: "Entrega" },
      header: ({ column }) => (
        <FilterHeader
          title="Entrega"
          column={column}
          options={filterOptions.mesesEntrega}
          label="mes de entrega"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.fecha_entrega_min, filterValue),
      accessorKey: "fecha_entrega_min",
      enableGlobalFilter: false,
      // `DataTable` es `table-fixed` y la celda no recorta: sin `size` (150 por
      // defecto) el rango `nowrap` más largo, "28 may 2026 – 28 may 2026"
      // (~178px a 14px), invadía "Clasificación". 178 + 32 de padding + holgura.
      size: 220,
      cell: ({ row }) => {
        const { fecha_entrega_min, fecha_entrega_max } = row.original;
        return (
          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatEntregaEstimada(fecha_entrega_min, fecha_entrega_max)}
          </span>
        );
      },
    },
    {
      id: "clasificacion",
      accessorKey: "clasificacion",
      meta: { label: "Clasificación" },
      header: ({ column }) => (
        <FilterHeader
          title="Clasificación"
          column={column}
          options={filterOptions.clasificaciones}
          label="clasificación"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        !filterValue || row.original.clasificacion === filterValue,
      enableGlobalFilter: false,
      // Etiqueta más larga: "X - Solo para facturar" (~136px) + 32 de padding.
      size: 180,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: "ultima_programacion",
      // Dato del PEDIDO, no de la parcialidad: el backend re-sella fecha y
      // usuario en todos los renglones en cada guardado.
      // Último guardado de la programación completa del pedido; aplica a
      // todas sus parcialidades.
      header: ({ column }) => (
        <FilterHeader
          title="Programación guardada"
          column={column}
          options={filterOptions.mesesProgramacion}
          label="mes de programación"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.ultimaProgramacion?.fecha, filterValue),
      meta: { label: "Programación guardada" },
      // Instante en ms (orden cronológico real, sin depender del offset del
      // ISO); sin fecha válida → `undefined`, que `sortUndefined: "last"`
      // manda al final en ambas direcciones.
      accessorFn: (row) => row.ultimaProgramacion?.time,
      sortingFn: "basic",
      sortUndefined: "last",
      enableGlobalFilter: false,
      size: 200,
      cell: ({ row }) => {
        const ultima = row.original.ultimaProgramacion;
        if (!ultima) return DASH;
        return (
          <div className="flex flex-col text-sm leading-tight">
            {/* Timestamp real: sin `timeZone: "UTC"` (ver `formatShortDate`). */}
            <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
              {formatShortDate(ultima.fecha)}
            </span>
            {ultima.usuario && (
              <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-45">
                {ultima.usuario}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      meta: { label: "Fecha" },
      header: ({ column }) => (
        <FilterHeader title="Fecha" column={column} options={filterOptions.meses} label="mes" />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesMonthFilter(row.original.created_at, filterValue),
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatShortDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      // Subtotal del PEDIDO completo (sin IVA), no de la parcialidad.
      // Importe sin IVA del pedido completo; se repite en cada parcialidad.
      header: ({ column }) => (
        <FilterHeader
          title="Importe del pedido"
          column={column}
          options={rangeOptions(IMPORTE_RANGES)}
          label="rango de importe"
          menuAlign="end"
        />
      ),
      filterFn: (row, _columnId, filterValue) =>
        matchesRangeFilter(IMPORTE_RANGES, row.original.subtotal, filterValue),
      enableGlobalFilter: false,
      meta: { align: "right", label: "Importe del pedido" },
      size: 180,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatOrderAmountOrDash(row.original.subtotal)}
        </span>
      ),
    },
  ];
}
