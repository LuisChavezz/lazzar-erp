"use client";

import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ChevronRightIcon, ViewIcon } from "@/src/components/Icons";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION, buildDistinctFilterOptions } from "@/src/utils/columnFilterOptions";
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

// ─── Filtros de encabezado ────────────────────────────────────────────────────
// Las cantidades se filtran por "con / sin" (mayor que cero o cero): es lo que
// se pregunta al planear ("¿hay existencia?", "¿hay algo en producción?"). La
// descripción, por producto, con buscador.

/** Opciones "con / sin" de una columna de cantidad. */
const presenceOptions = (con: string, sin: string): ColumnFilterOption[] => [
  ALL_FILTER_OPTION,
  { value: "con", label: con },
  { value: "sin", label: sin },
];

const presenceFilter =
  (pick: (row: InventoryPipelineRow) => number) =>
  (row: { original: InventoryPipelineRow }, _columnId: string, filterValue: string | undefined) =>
    !filterValue || (filterValue === "con") === pick(row.original) > 0;

export function buildInventoryPipelineFilterOptions(
  rows: InventoryPipelineRow[],
): { descripciones: ColumnFilterOption[] } {
  return {
    descripciones: [ALL_FILTER_OPTION, ...buildDistinctFilterOptions(rows, (r) => r.descripcion)],
  };
}

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
export const getInventoryPipelineColumns = (
  onViewDetails: (productoId: number) => void,
  filterOptions: { descripciones: ColumnFilterOption[] } = { descripciones: [ALL_FILTER_OPTION] },
) => [
  columnHelper.accessor("codigo", {
    header: "Código",
    size: 130,
    cell: ({ row }) => <CodigoCell row={row.original} onViewDetails={onViewDetails} />,
  }),
  columnHelper.accessor("descripcion", {
    meta: { label: "Descripción" },
    size: 300,
    header: ({ column }) => (
      <FilterHeader
        title="Descripción"
        column={column}
        options={filterOptions.descripciones}
        label="producto"
        searchable={{ placeholder: "Buscar producto…" }}
      />
    ),
    filterFn: (row, _columnId, filterValue) =>
      !filterValue || row.original.descripcion === filterValue,
    cell: (info) => (
      <span
        className="block truncate text-sm font-medium text-slate-700 dark:text-slate-200"
        title={info.getValue() || undefined}
      >
        {info.getValue() || "—"}
      </span>
    ),
  }),
  columnHelper.accessor("disponible", {
    size: 120,
    header: ({ column }) => (
      <FilterHeader
        title="Disponible"
        column={column}
        options={presenceOptions("Con existencia", "Sin existencia")}
        label="existencia"
      />
    ),
    filterFn: presenceFilter((r) => r.disponible),
    enableGlobalFilter: false,
    meta: { align: "right", label: "Disponible" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("enOp", {
    size: 120,
    header: ({ column }) => (
      <FilterHeader
        title="En OP"
        column={column}
        options={presenceOptions("En producción", "Sin producción")}
        label="producción"
      />
    ),
    filterFn: presenceFilter((r) => r.enOp),
    enableGlobalFilter: false,
    meta: { align: "right", label: "En OP" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("total", {
    size: 120,
    header: ({ column }) => (
      <FilterHeader
        title="Total"
        column={column}
        options={presenceOptions("Con total", "En cero")}
        label="total"
      />
    ),
    filterFn: presenceFilter((r) => r.total),
    enableGlobalFilter: false,
    meta: { align: "right", label: "Total" },
    cell: (info) => (
      <span className="text-sm tabular-nums font-semibold text-slate-800 dark:text-white">
        {formatExactQuantityValue(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("comprasPendientes", {
    size: 150,
    header: ({ column }) => (
      <FilterHeader
        title="Compras pendientes"
        column={column}
        options={presenceOptions("Con compras", "Sin compras")}
        label="compras pendientes"
      />
    ),
    filterFn: presenceFilter((r) => r.comprasPendientes),
    enableGlobalFilter: false,
    meta: { align: "right", label: "Compras pendientes" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("opCount", {
    size: 120,
    header: ({ column }) => (
      <FilterHeader
        title="OP abiertas"
        column={column}
        options={presenceOptions("Con OP", "Sin OP")}
        label="órdenes de producción"
      />
    ),
    filterFn: presenceFilter((r) => r.opCount),
    enableGlobalFilter: false,
    meta: { align: "right", label: "OP abiertas" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
  columnHelper.accessor("ocCount", {
    size: 120,
    header: ({ column }) => (
      <FilterHeader
        title="OC abiertas"
        column={column}
        options={presenceOptions("Con OC", "Sin OC")}
        label="órdenes de compra"
        menuAlign="end"
      />
    ),
    filterFn: presenceFilter((r) => r.ocCount),
    enableGlobalFilter: false,
    meta: { align: "right", label: "OC abiertas" },
    cell: (info) => <QuantityCell value={info.getValue()} />,
  }),
] as ColumnDef<InventoryPipelineRow>[];
