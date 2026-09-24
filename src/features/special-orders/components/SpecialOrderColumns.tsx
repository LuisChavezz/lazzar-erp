"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { getPedidoClasificacionLabel } from "@/src/features/orders/constants/pedidoStatus";
import { parseLocalDate } from "@/src/utils/formatDate";
import type { SpecialOrderRow } from "../utils/specialOrderFilters";

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
    cell: (info) => (
      <button
        type="button"
        onClick={() => onViewDetail(info.row.original.id)}
        className="font-mono text-slate-700 dark:text-slate-200 font-semibold hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
        title="Ver detalle"
      >
        {info.getValue<string>()}
      </button>
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
  {
    id: "acciones",
    header: "Acciones",
    enableSorting: false,
    meta: { align: "center" },
    cell: ({ row }) => {
      const items: ActionMenuItem[] = [
        { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(row.original.id) },
      ];
      return (
        <div className="flex items-center justify-center">
          <ActionMenu
            items={items}
            ariaLabel={`Acciones de ${row.original.folio || `pedido ${row.original.id}`}`}
          />
        </div>
      );
    },
  },
];
