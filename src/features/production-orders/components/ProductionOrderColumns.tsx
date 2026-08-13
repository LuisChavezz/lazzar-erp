"use client";

import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { ProductionOrderListItem } from "../interfaces/production-order.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  PRODUCTION_ORDER_PRIORITY_CONFIG,
  productionOrderPriorityFallback,
  productionOrderStatusEntry,
} from "../constants/productionOrderStatus";

const columnHelper = createColumnHelper<ProductionOrderListItem>();

const ActionsCell = ({
  row,
  onViewDetails,
}: {
  row: ProductionOrderListItem;
  onViewDetails: (id: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    {
      label: 'Ver detalle',
      icon: ViewIcon,
      onSelect: () => onViewDetails(row.op_id),
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones de la orden ${row.folio_op}`}
      />
    </div>
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
 */
export function getProductionOrderColumns(
  onViewDetails: (id: number) => void,
): ColumnDef<ProductionOrderListItem, unknown>[] {
  return [
    // Folio OP
    columnHelper.accessor('folio_op', {
      header: 'Folio OP',
      size: 130,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {getValue()}
        </span>
      ),
    }),

    // Estatus
    //
    // Se accede por `estatus_op_display` (la etiqueta que resuelve el backend)
    // para que la búsqueda y el orden trabajen sobre el texto que el usuario
    // ve, no sobre el entero; el color del badge sí sale del entero
    // `estatus_op`. `id` explícito conserva la visibilidad/orden de columna que
    // ya tenga guardada `DataTable`.
    columnHelper.accessor((row) => row.estatus_op_display ?? '', {
      id: 'estatus_op',
      header: 'Estatus',
      size: 130,
      cell: ({ row }) => (
        <StatusBadge
          status={String(row.original.estatus_op)}
          config={{
            [row.original.estatus_op]: productionOrderStatusEntry(
              row.original.estatus_op,
              row.original.estatus_op_display,
            ),
          }}
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

    // Acciones
    columnHelper.display({
      id: 'acciones',
      header: () => <div className="text-center">Acciones</div>,
      size: 90,
      cell: ({ row }) => <ActionsCell row={row.original} onViewDetails={onViewDetails} />,
    }),
  ] as ColumnDef<ProductionOrderListItem, unknown>[];
}
