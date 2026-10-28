"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import type { ProductionOrderListItem } from "../interfaces/production-order.interface";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { RouteIcon, ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  PRODUCTION_ORDER_STATUS_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "../constants/productionOrderStatus";

const columnHelper = createColumnHelper<ProductionOrderListItem>();

const FolioCell = ({
  row,
  onViewDetails,
  onOpenCriticalPath,
}: {
  row: ProductionOrderListItem;
  onViewDetails: (id: number) => void;
  onOpenCriticalPath: (row: ProductionOrderListItem) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: 'Ver detalle',
      icon: ViewIcon,
      onSelect: () => onViewDetails(row.op_id),
    },
    {
      label: 'Ruta crítica',
      icon: RouteIcon,
      onSelect: () => onOpenCriticalPath(row),
    },
  ];

  return (
    <FolioActionMenu
      folio={row.folio_op}
      items={menuItems}
      status={
        <StatusBadge
          status={String(row.estatus_op)}
          config={{ [row.estatus_op]: productionOrderStatusEntry(row.estatus_op, row.estatus_op_display) }}
        />
      }
    />
  );
};

/**
 * Columnas del listado de órdenes de producción.
 *
 * Fábrica —no un arreglo estático— para inyectar `onViewDetails`, que NAVEGA a
 * `/manufacturing/production-orders/[id]` en vez de abrir un diálogo montado
 * dentro de la celda. Mismo patrón `getXColumns(onViewDetails)` que
 * `getEmbroideryOrderColumns`/`getReflectiveOrderColumns`/
 * `getCorteMangaOrderColumns`; aquí el callback recibe `op_id` (la PK de esta
 * orden), no `id`.
 *
 * `onOpenCriticalPath` solo AVISA al listado, que es dueño del diálogo de ruta
 * crítica: montado dentro de la celda, un refetch o un cambio de página lo
 * desmontaría a media captura.
 */
export function getProductionOrderColumns(
  onViewDetails: (id: number) => void,
  onOpenCriticalPath: (row: ProductionOrderListItem) => void,
): ColumnDef<ProductionOrderListItem, unknown>[] {
  return [
    // Folio OP: es el menú de acciones de la fila (con ">") y lleva el estatus
    // a su lado; sin columnas aparte de "Estatus" ni "Acciones".
    columnHelper.accessor('folio_op', {
      header: 'Folio OP',
      size: 180,
      cell: ({ row }) => (
        <FolioCell
          row={row.original}
          onViewDetails={onViewDetails}
          onOpenCriticalPath={onOpenCriticalPath}
        />
      ),
    }),

    // Prioridad
    //
    // Badge y no el entero crudo: el mismo dato se leía "1" aquí y "Alta" en la
    // página de detalle. Mismo par config+fallback que ya usan las columnas de
    // bordado/reflejante/corte de manga.
    columnHelper.accessor('prioridad', {
      header: 'Prioridad',
      size: 90,
      cell: ({ getValue }) => {
        const prioridad = getValue();
        return (
          <StatusBadge
            status={String(prioridad)}
            config={PRODUCTION_ORDER_PRIORITY_CONFIG}
            defaultConfig={productionOrderPriorityFallback(prioridad)}
          />
        );
      },
    }),

    // Fecha inicio
    columnHelper.accessor('fecha_inicio', {
      header: 'Fecha inicio',
      size: 130,
      cell: ({ getValue }) => {
        const fecha = new Date(getValue());
        return (
          <span className="text-xs tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    }),

    // Fecha fin
    //
    // `accessorFn` que colapsa `null` a `''` — mismo bug de
    // `getColumnCanGlobalFilter`/`flatRows[0]` que ya documenta
    // `CorteMangaOrderColumns.tsx`. `id` explícito conserva la
    // visibilidad/orden de columna que guarda `DataTable`; `fecha_fin` es
    // nula en toda orden aún no terminada.
    columnHelper.accessor((row) => row.fecha_fin ?? '', {
      id: 'fecha_fin',
      header: 'Fecha fin',
      size: 130,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) {
          return <span className="text-xs text-slate-400 dark:text-slate-600 italic">—</span>;
        }
        const fecha = new Date(val);
        const hoy   = new Date();
        const vencida = fecha < hoy;
        return (
          <span
            className={`text-xs tabular-nums whitespace-nowrap ${
              vencida
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {fecha.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        );
      },
    }),

    // Activo
    columnHelper.accessor('activo', {
      header: 'Activo',
      size: 80,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
              val
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-500/10 dark:text-zinc-400'
            }`}
          >
            {val ? 'Sí' : 'No'}
          </span>
        );
      },
    }),

  ] as ColumnDef<ProductionOrderListItem, unknown>[];
}

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Las opciones salen del listado completo (la tabla es de modo cliente),
 * salvo las columnas `options`: ahí salen del catálogo del front, más los
 * valores de las filas que el catálogo no cubre.
 */
export const PRODUCTION_ORDER_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<ProductionOrderListItem>>> = {
  folio_op: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus_op,
    options: optionsFromConfig(PRODUCTION_ORDER_STATUS_CONFIG),
    label: (r) => productionOrderStatusEntry(r.estatus_op, r.estatus_op_display).label,
  },
  prioridad: {
    type: "options",
    get: (r) => r.prioridad,
    options: optionsFromConfig(PRODUCTION_ORDER_PRIORITY_CONFIG),
    label: (r) => productionOrderPriorityFallback(r.prioridad).label,
  },
  fecha_inicio: { type: "month", get: (r) => r.fecha_inicio },
  fecha_fin: { type: "month", get: (r) => r.fecha_fin, emptyLabel: "Sin fecha fin" },
  activo: { type: "boolean", get: (r) => r.activo, yes: "Activas", no: "Inactivas" },
};
