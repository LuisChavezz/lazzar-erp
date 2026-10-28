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
};
