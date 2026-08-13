"use client";

import { useState } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import type { ProductionOrderListItem } from "../interfaces/production-order.interface";
import { ActionMenu } from "@/src/components/ActionMenu";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { productionOrderStatusEntry } from "../constants/productionOrderStatus";
import { ProductionOrderDetailDialog } from "./ProductionOrderDetailDialog";

const columnHelper = createColumnHelper<ProductionOrderListItem>();

const ActionsCell = ({ row }: { row: ProductionOrderListItem }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const menuItems: ActionMenuItem[] = [
    {
      label: 'Ver detalle',
      icon: ViewIcon,
      onSelect: () => setIsDetailOpen(true),
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones de la orden ${row.folio_op}`}
      />
      <ProductionOrderDetailDialog
        opId={isDetailOpen ? row.op_id : 0}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
};

export function getProductionOrderColumns(): ColumnDef<ProductionOrderListItem, unknown>[] {
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
    columnHelper.accessor('prioridad', {
      header: 'Prioridad',
      size: 90,
      cell: ({ getValue }) => (
        <span className="text-sm tabular-nums text-slate-700 dark:text-slate-300">
          {getValue()}
        </span>
      ),
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
      cell: ({ row }) => <ActionsCell row={row.original} />,
    }),
  ] as ColumnDef<ProductionOrderListItem, unknown>[];
}
