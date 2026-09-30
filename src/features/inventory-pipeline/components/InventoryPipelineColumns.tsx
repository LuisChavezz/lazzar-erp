"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ChevronRightIcon, ViewIcon } from "@/src/components/Icons";
import { formatExactQuantityValue } from "@/src/utils/formatCurrency";
import type { InventoryPipelineRow } from "../interfaces/inventory-pipeline.interface";

const columnHelper = createColumnHelper<InventoryPipelineRow>();

/**
 * Código del producto como disparador del menú de acciones, sin columna de
 * Acciones aparte — mismo patrón que la columna "Cotización" de Mesa de Control
 * (`OperationsQuoteIdCell`). A diferencia de allá, el menú NO abre un diálogo
 * propio: "Ver detalle" invoca el callback de `InventoryPipelineView`, dueño del
 * estado del diálogo.
 */
const CodigoCell = ({
  row,
  onViewDetails,
}: {
  row: InventoryPipelineRow;
  onViewDetails: (productoId: number) => void;
}) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetails(row.productoId) },
  ];
  return (
    <ActionMenu
      items={menuItems}
      ariaLabel={`Acciones de ${row.codigo}`}
      align="start"
      trigger={
        <button
          type="button"
          aria-label={`Ver acciones del producto ${row.codigo}`}
          className="group inline-flex items-center gap-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 px-2.5 py-1 font-mono font-bold text-sky-700 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
        >
          {row.codigo || "—"}
          <ChevronRightIcon
            className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform"
            aria-hidden="true"
          />
        </button>
      }
    />
  );
};

const QuantityCell = ({ value }: { value: number }) => (
  <span className="text-sm tabular-nums text-slate-700 dark:text-slate-200">
    {formatExactQuantityValue(value)}
  </span>
);

/**
 * Columnas del reporte de existencias, producción y compras.
 *
 * Fábrica con `onViewDetails` para que el diálogo de detalle viva en
 * `InventoryPipelineView` y no dentro de la celda (una celda se desmonta al
 * ordenar/paginar/filtrar). Mismo patrón que `getCorteMangaOrderColumns`.
 *
 * Búsqueda global: solo `codigo` y `descripcion`. Las columnas numéricas llevan
 * `enableGlobalFilter: false` —TanStack también busca en valores `number`, y
 * un "150" coincidiendo con una cantidad confundiría—. `codigo`/`descripcion`
 * llegan siempre como `string` (el mapper colapsa `null` a `""`), así que no
 * les afecta el pitfall de la primera fila nula (ver `CorteMangaOrderColumns`).
 *
 * Las cantidades son `number` (el mapper las parsea) para que ordenen por
 * valor; el formato se aplica aquí con `formatExactQuantityValue`.
 */
export const getInventoryPipelineColumns = (onViewDetails: (productoId: number) => void) => [
  columnHelper.accessor("codigo", {
    header: "Código",
    cell: ({ row }) => <CodigoCell row={row.original} onViewDetails={onViewDetails} />,
  }),
  columnHelper.accessor("descripcion", {
    header: "Descripción",
    cell: (info) => (
      <span
        className="block max-w-80 truncate text-sm text-slate-600 dark:text-slate-300"
        title={info.getValue() || undefined}
      >
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("disponible", {
    header: "Disponible",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("enOp", {
    header: "En OP",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("total", {
    header: "Total",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-sm tabular-nums font-semibold text-slate-800 dark:text-white">
        {formatExactQuantityValue(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("comprasPendientes", {
    header: "Compras pendientes",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("opCount", {
    header: "OP abiertas",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("ocCount", {
    header: "OC abiertas",
    enableGlobalFilter: false,
    meta: { align: "right" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
] as ColumnDef<InventoryPipelineRow>[];
