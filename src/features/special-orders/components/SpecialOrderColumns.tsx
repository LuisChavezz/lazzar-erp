"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import {
  getPedidoClasificacionLabel,
  PEDIDO_CLASIFICACION_CONFIG,
} from "@/src/features/orders/constants/pedidoStatus";
import { parseLocalDate } from "@/src/utils/formatDate";
import type { SpecialOrderRow } from "../utils/specialOrderFilters";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { EntregaCell, getSiguientePaso, OpsCell, SiguientePasoCell, TrabajoCell } from "./SpecialOrderPriorityCells";

/**
 * Columnas que dependen de campos opcionales del backend: la vista solo las
 * monta si alguna fila trae el dato (ver `SpecialOrdersView`).
 */
export const OPTIONAL_COLUMN_FIELDS: Record<string, (order: SpecialOrderRow) => unknown> = {
  fecha_compromiso: (o) => o.fecha_compromiso,
  trabajo: (o) => o.prendas_total ?? o.piezas_total,
  siguiente_paso: (o) => getSiguientePaso(o) ?? undefined,
  ordenes_produccion: (o) => o.ordenes_produccion,
};

/**
 * "X de Y tallas" con barra: verde al completar, ámbar si falta alguna, gris
 * si ninguna tiene SKU. Debajo, cuántas ya están en catálogo.
 */
const SkuProgressCell = ({ order }: { order: SpecialOrderRow }) => {
  const total = order.tallas_total;
  const conSku = order.tallas_con_sku;
  if (total === undefined || conSku === undefined) {
    return <span className="text-sm text-slate-400 dark:text-slate-600">—</span>;
  }
  if (total <= 0) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">Sin tallas</span>;
  }
  const pct = Math.min(100, Math.round((conSku / total) * 100));
  const tone =
    conSku >= total
      ? { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Completo" }
      : conSku === 0
        ? { text: "text-slate-500 dark:text-slate-400", bar: "bg-slate-400", label: "Sin SKU" }
        : { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", label: "Incompleto" };
  return (
    <div className="flex flex-col gap-1" title={`${conSku} de ${total} tallas con SKU`}>
      <span className="text-xs whitespace-nowrap">
        <span className={`font-semibold ${tone.text}`}>{tone.label}</span>{" "}
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {conSku}/{total} tallas
        </span>
      </span>
      <span
        className="h-1 w-24 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tallas con SKU"
      >
        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </span>
      {order.tallas_en_catalogo !== undefined && (
        <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
          {order.tallas_en_catalogo}/{total} en catálogo
        </span>
      )}
    </div>
  );
};

export interface SpecialOrderColumnCallbacks {
  /** Navega a la página de detalle del pedido especial. */
  onViewDetail: (id: number) => void;
}

/**
 * Columnas del listado de pedidos especiales. Fábrica para recibir el callback
 * de "Ver detalle" (mismo patrón `getXxxColumns(callbacks)` del resto).
 *
 * Los `accessorFn` que colapsan `null` a `""` no son estética: `DataTable` usa
 * el `getColumnCanGlobalFilter` por defecto de TanStack, que decide si una
 * columna es buscable mirando SOLO la primera fila. Aquí la primera fila es
 * casi siempre un pedido sin confirmar (el servidor ordena los `null` primero),
 * así que sin el colapso la columna quedaría fuera de la búsqueda (ver
 * `CorteMangaOrderColumns`/`SharedOrderColumns`).
 */
export const getSpecialOrderColumns = ({
  onViewDetail,
}: SpecialOrderColumnCallbacks): ColumnDef<SpecialOrderRow>[] => [
  {
    id: "folio",
    // El valor buscable es EXACTAMENTE el texto pintado, incluido el respaldo
    // `Pedido #id` cuando `folio` es nulo: así la búsqueda encuentra lo que se ve.
    accessorFn: (order) => order.folio || `Pedido #${order.id}`,
    header: "Folio",
    // El folio es el menú de acciones de la fila (con ">"): sin columna aparte
    // de "Acciones", igual que el resto de los listados de Producción.
    size: 180,
    cell: (info) => (
      <FolioActionMenu
        folio={info.getValue<string>()}
        items={[
          { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(info.row.original.id) },
        ]}
      />
    ),
  },
  {
    id: "cliente_nombre",
    accessorFn: (order) => order.cliente_nombre ?? "",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-sm text-slate-700 dark:text-slate-200">
        {row.original.cliente_nombre || "—"}
      </span>
    ),
  },
  {
    id: "clasificacion",
    // La etiqueta y no el código: es lo que se lee (y lo que ordena).
    accessorFn: (order) => getPedidoClasificacionLabel(order.clasificacion),
    header: "Clasificación",
    // La búsqueda es por folio y cliente; la clasificación se filtra con su chip.
    enableGlobalFilter: false,
    cell: ({ row }) => {
      const sinClasificacion = !row.original.clasificacion;
      return (
        <span
          className={`text-sm whitespace-nowrap ${
            sinClasificacion
              ? "text-slate-400 dark:text-slate-500"
              : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {getPedidoClasificacionLabel(row.original.clasificacion)}
        </span>
      );
    },
  },
  {
    // Qué urge: fecha compromiso y días que faltan. Sin fecha, al final.
    id: "fecha_compromiso",
    accessorFn: (order) => order.fecha_compromiso ?? undefined,
    header: "Entrega",
    sortUndefined: "last",
    enableGlobalFilter: false,
    size: 150,
    cell: ({ row }) => <EntregaCell fecha={row.original.fecha_compromiso} />,
  },
  {
    // Tamaño del trabajo y servicios que lleva.
    id: "trabajo",
    accessorFn: (order) => order.piezas_total,
    header: "Trabajo",
    meta: { label: "Trabajo" },
    sortUndefined: "last",
    enableGlobalFilter: false,
    size: 190,
    cell: ({ row }) => <TrabajoCell order={row.original} />,
  },
  {
    id: "siguiente_paso",
    accessorFn: (order) => getSiguientePaso(order)?.label ?? "",
    header: "Siguiente paso",
    enableGlobalFilter: false,
    size: 150,
    cell: ({ row }) => <SiguientePasoCell order={row.original} />,
  },
  {
    // Las OP del pedido; el folio se puede buscar.
    id: "ordenes_produccion",
    accessorFn: (order) => (order.ordenes_produccion ?? []).map((op) => op.folio_op).join(" "),
    header: "OP",
    enableSorting: false,
    size: 200,
    cell: ({ row }) => <OpsCell order={row.original} />,
  },
  {
    // Avance del alta de SKU (tallas con SKU de producción contra tallas con
    // cantidad). Ordena por porcentaje; sin datos del backend, "—" al final.
    id: "sku_avance",
    accessorFn: (order) =>
      order.tallas_total && order.tallas_con_sku !== undefined
        ? order.tallas_con_sku / order.tallas_total
        : undefined,
    header: "SKU",
    meta: { label: "SKU" },
    sortUndefined: "last",
    enableGlobalFilter: false,
    size: 170,
    cell: ({ row }) => <SkuProgressCell order={row.original} />,
  },
  {
    // Mismo formato y parseo que "Fecha confirmada" del listado de pedidos
    // (`SharedOrderColumns`): el valor es medianoche LOCAL con offset, y
    // `parseLocalDate` lo interpreta en la zona del navegador sin forzar UTC.
    id: "fecha_confirmacion",
    accessorFn: (order) => order.fecha_confirmacion ?? "",
    header: "Fecha confirmada",
    // El valor crudo es un ISO: buscar en él no corresponde a nada visible.
    enableGlobalFilter: false,
    cell: ({ row }) => {
      const parsedDate = parseLocalDate(row.original.fecha_confirmacion);
      return (
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {parsedDate ? format(parsedDate, "d MMM yyyy", { locale: es }) : "—"}
        </span>
      );
    },
  },
];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Las opciones salen del listado completo (la tabla es de modo cliente),
 * salvo las columnas `options`: ahí salen del catálogo del front, más los
 * valores de las filas que el catálogo no cubre.
 */
export const SPECIAL_ORDER_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<SpecialOrderRow>>> = {
  cliente_nombre: { type: "distinct", get: (r) => r.cliente_nombre, searchable: true },
  clasificacion: {
    type: "options",
    get: (r) => r.clasificacion,
    options: optionsFromConfig(PEDIDO_CLASIFICACION_CONFIG),
    label: (r) => getPedidoClasificacionLabel(r.clasificacion),
  },
  fecha_confirmacion: { type: "month", get: (r) => r.fecha_confirmacion, emptyLabel: "Sin confirmar" },
  siguiente_paso: { type: "distinct", get: (r) => getSiguientePaso(r)?.label ?? null },
};
