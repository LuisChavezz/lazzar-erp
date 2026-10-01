"use client";

import { type ColumnDef, type FilterFn, type SortingFn } from "@tanstack/react-table";
import { Popover } from "@radix-ui/themes";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatPiezas } from "@/src/utils/formatWorkOrderProgramado";
import { formatEntregaEstimada, hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusConfig,
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

export function getScheduledOrderColumns(): ColumnDef<ScheduledParcialidadRow, unknown>[] {
  return [
    {
      id: "folio",
      header: "Folio",
      meta: { label: "Folio" },
      // Folio + OC: alimenta la búsqueda global con ambos (la OC no tiene
      // columna propia). El orden NO usa esa cadena: `folioSortingFn` compara
      // solo el folio.
      accessorFn: (row) =>
        [row.folio ?? "", hasMeaningfulOc(row.oc) ? row.oc : ""].join(" ").trim(),
      sortingFn: folioSortingFn,
      size: 190,
      cell: ({ row }) => {
        const parcialidad = row.original;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <PedidoFolioLink
              pedidoId={parcialidad.pedidoId}
              folio={parcialidad.folio}
              from="scheduled-orders"
              className="font-mono text-[13px] font-bold text-slate-800 dark:text-white"
            />
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
      header: "Parcialidad",
      accessorFn: (row) => row.indice,
      // Sin orden propio: ordenar por índice mezclaría las "1 de N" de todos
      // los pedidos. Ordenar por Folio ya deja cada pedido junto y en orden.
      enableSorting: false,
      enableGlobalFilter: false,
      meta: { align: "center" },
      size: 120,
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
      header: "Cantidad",
      accessorFn: (row) => getCantidadValue(row.cantidad),
      sortingFn: "basic",
      sortUndefined: "last",
      enableGlobalFilter: false,
      meta: { align: "right" },
      size: 120,
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
      header: "Comentarios",
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
      header: "Razón social",
      cell: ({ row }) => (
        <span className="block text-sm text-slate-600 dark:text-slate-300 truncate max-w-55">
          {row.original.cliente_razon_social || "—"}
        </span>
      ),
    },
    {
      id: "estatus",
      accessorKey: "estatus",
      header: "Estatus",
      enableGlobalFilter: false,
      meta: { align: "center" },
      cell: ({ row }) => {
        const { label, className } = getPedidoEstatusConfig(row.original.estatus);
        return (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${className}`}
          >
            {label}
          </span>
        );
      },
    },
    {
      id: "entrega",
      header: "Entrega",
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
      header: "Clasificación",
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
      header: () => (
        <span title="Último guardado de la programación completa del pedido; aplica a todas sus parcialidades.">
          Programación guardada
        </span>
      ),
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
      header: "Fecha",
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
      header: () => (
        <span title="Importe sin IVA del pedido completo; se repite en cada parcialidad.">
          Importe del pedido
        </span>
      ),
      enableGlobalFilter: false,
      meta: { align: "right", label: "Importe del pedido" },
      size: 180,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.subtotal)}
        </span>
      ),
    },
  ];
}
