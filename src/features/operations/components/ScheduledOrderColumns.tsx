"use client";

import { type ColumnDef, type FilterFn } from "@tanstack/react-table";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { formatShortDate } from "@/src/utils/formatDate";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { formatPiezas } from "@/src/utils/formatWorkOrderProgramado";
import { formatEntregaEstimada, hasMeaningfulOc } from "@/src/features/orders/utils/pedidoFormat";
import type { PedidoListItem } from "@/src/features/orders/interfaces/order.interface";
import type { PedidoProgramacion } from "@/src/features/orders/interfaces/pedido-programacion.interface";
import {
  getPedidoClasificacionLabel,
  getPedidoEstatusConfig,
} from "@/src/features/orders/constants/pedidoStatus";
import {
  getPedidoProgramacionDestinoLabel,
  PEDIDO_PROGRAMACION_DESTINOS,
  PEDIDO_PROGRAMACION_DESTINO_LABELS,
} from "@/src/features/orders/constants/pedidoProgramacion";

/**
 * Columnas de "Pedidos programados" (Mesa de Control, SOLO LECTURA). Hermanas
 * de `OperationsOrderColumns`, sin sus acciones de edición/programación: el
 * folio abre directamente el detalle 360°. Se omiten sus columnas placeholder
 * (Piezas, Vendedor, C.P.) y se agregan las de programación y entrega, que el
 * listado sí trae.
 */
export interface ScheduledOrderColumnCallbacks {
  onViewDetail: (order: PedidoListItem) => void;
}

/**
 * Entradas de `programacion_conf`, tolerando `null`, `{}` y un
 * `programaciones` ausente o no-arreglo (el filtro `programado=true` ya los
 * excluye, pero el tipo los admite).
 */
export const getProgramaciones = (order: PedidoListItem): PedidoProgramacion[] => {
  const programaciones: unknown = order.programacion_conf?.programaciones;
  if (!Array.isArray(programaciones)) return [];
  // Solo objetos: un elemento `null`/primitivo en el JSON rompería cualquier
  // lectura de `destino`/`cantidad`/`fecha` más abajo.
  return programaciones.filter(
    (p): p is PedidoProgramacion => typeof p === "object" && p !== null && !Array.isArray(p),
  );
};

/**
 * "Última programación" del PEDIDO. El backend reescribe `fecha`/`usuario_*`
 * en TODAS las entradas en cada reprogramación, así que son iguales; aun así se
 * toma la más reciente por si alguna vez difieren. Nunca se muestra por destino.
 */
const getUltimaProgramacion = (
  order: PedidoListItem,
): { fecha: string; time: number; usuario: string | null } | null => {
  let latest: { fecha: string; time: number; usuario: string | null } | null = null;
  for (const programacion of getProgramaciones(order)) {
    if (typeof programacion.fecha !== "string" || !programacion.fecha) continue;
    const time = new Date(programacion.fecha).getTime();
    if (Number.isNaN(time)) continue;
    if (!latest || time > latest.time) {
      latest = {
        fecha: programacion.fecha,
        time,
        usuario:
          typeof programacion.usuario_nombre === "string"
            ? programacion.usuario_nombre.trim() || null
            : null,
      };
    }
  }
  return latest;
};

/**
 * Piezas de una entrada con el formato común de la app ("N pzas", invariable).
 * `cantidad` viene de un `JSONField`: si falta o no es numérica se pinta "—"
 * en vez de dejar que `formatPiezas` la muestre como "0 pzas".
 */
const formatCantidad = (cantidad: unknown): string => {
  const value =
    typeof cantidad === "number"
      ? cantidad
      : typeof cantidad === "string" && cantidad.trim() !== ""
        ? Number(cantidad)
        : NaN;
  return Number.isFinite(value) ? formatPiezas(value) : "—";
};

/** Texto buscable de la columna: las etiquetas en español que pinta la celda. */
const getDestinoLabels = (order: PedidoListItem): string =>
  getProgramaciones(order)
    .map((p) => getPedidoProgramacionDestinoLabel(String(p.destino)))
    .join(", ");

const DESTINO_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...PEDIDO_PROGRAMACION_DESTINOS.map((destino) => ({
    value: destino,
    label: PEDIDO_PROGRAMACION_DESTINO_LABELS[destino],
  })),
];

/** Un pedido coincide si CUALQUIERA de sus entradas va a ese destino. */
const destinoFilterFn: FilterFn<PedidoListItem> = (row, _columnId, filterValue) => {
  if (!filterValue) return true;
  return getProgramaciones(row.original).some((p) => p.destino === filterValue);
};

const DASH = <span className="text-slate-400 dark:text-slate-600">—</span>;

export function getScheduledOrderColumns({
  onViewDetail,
}: ScheduledOrderColumnCallbacks): ColumnDef<PedidoListItem, unknown>[] {
  return [
    {
      id: "folio",
      accessorKey: "folio",
      size: 190,
      header: "Folio",
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onViewDetail(order)}
              title="Ver detalle"
              className="font-mono text-[13px] font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
            >
              {order.folio || "—"}
            </button>
            {hasMeaningfulOc(order.oc) && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-mono"
                title={`Orden de compra: ${order.oc}`}
              >
                OC {order.oc}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "razon_social",
      accessorKey: "cliente_razon_social",
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
      id: "programacion",
      header: ({ column }) => (
        <div className="flex items-center gap-1.5">
          <span>Programación</span>
          <ColumnHeaderFilter column={column} options={DESTINO_FILTER_OPTIONS} label="destino" />
        </div>
      ),
      meta: { label: "Programación" },
      // El accessor alimenta la búsqueda global con las etiquetas visibles; el
      // filtro por destino lee los CÓDIGOS de `row.original` (`destinoFilterFn`).
      accessorFn: getDestinoLabels,
      filterFn: destinoFilterFn,
      enableSorting: false,
      size: 260,
      cell: ({ row }) => {
        const programaciones = getProgramaciones(row.original);
        if (programaciones.length === 0) return DASH;
        return (
          <div className="flex flex-wrap gap-1.5">
            {programaciones.map((programacion, index) => (
              <span
                key={`${programacion.destino}-${index}`}
                className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap"
              >
                {getPedidoProgramacionDestinoLabel(String(programacion.destino))}
                <span className="tabular-nums font-semibold">
                  {formatCantidad(programacion.cantidad)}
                </span>
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "ultima_programacion",
      header: "Última programación",
      // Instante en ms (orden cronológico real, sin depender del offset del
      // ISO); sin fecha válida → `undefined`, que `sortUndefined: "last"`
      // manda al final en ambas direcciones.
      accessorFn: (order) => getUltimaProgramacion(order)?.time,
      sortingFn: "basic",
      sortUndefined: "last",
      cell: ({ row }) => {
        const ultima = getUltimaProgramacion(row.original);
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
      id: "entrega",
      header: "Entrega",
      accessorKey: "fecha_entrega_min",
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
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      ),
    },
    {
      id: "created_at",
      accessorKey: "created_at",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatShortDate(row.original.created_at)}
        </span>
      ),
    },
    {
      id: "importe_sin_iva",
      accessorKey: "subtotal",
      header: "Importe sin IVA",
      meta: { align: "right" },
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-semibold text-slate-700 dark:text-slate-200">
          {formatMoneyValueOrDash(row.original.subtotal)}
        </span>
      ),
    },
  ];
}
