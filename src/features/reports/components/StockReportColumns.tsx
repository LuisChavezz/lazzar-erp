"use client";

import type { ColumnDef, SortingFn } from "@tanstack/react-table";
import type { StockReportRow } from "@/src/features/stock/interfaces/stock-report.interface";
import {
  formatMoneyValue,
  formatQuantityValue,
  safeParseAmount,
} from "@/src/utils/formatCurrency";

// Campos que llegan como string decimal del backend (p. ej. "10.0000").
type NumericKey =
  | "existencia_inicial"
  | "entradas"
  | "salidas"
  | "existencia_final"
  | "costo_unitario_final"
  | "costo_existencia_final";

// Orden numérico real para columnas cuyo valor es un string decimal (evita el
// orden alfanumérico que TanStack infiere para strings). Misma técnica que
// `invoiceColumns` para `total`.
const numericSortingFn =
  (key: NumericKey): SortingFn<StockReportRow> =>
  (rowA, rowB) =>
    safeParseAmount(rowA.original[key]) - safeParseAmount(rowB.original[key]);

// ── Fábricas de columnas numéricas (alineadas a la derecha, tabular-nums) ─────

const quantityColumn = (
  key: NumericKey,
  header: string,
): ColumnDef<StockReportRow> => ({
  accessorKey: key,
  header,
  meta: { label: header },
  sortingFn: numericSortingFn(key),
  cell: ({ row }) => (
    <div className="text-right tabular-nums text-slate-700 dark:text-slate-200">
      {formatQuantityValue(row.original[key])}
    </div>
  ),
});

const currencyColumn = (
  key: NumericKey,
  header: string,
): ColumnDef<StockReportRow> => ({
  accessorKey: key,
  header,
  meta: { label: header },
  sortingFn: numericSortingFn(key),
  cell: ({ row }) => (
    <div className="text-right font-semibold tabular-nums text-slate-700 dark:text-slate-200">
      {formatMoneyValue(row.original[key])}
    </div>
  ),
});

// Marcador para valores de texto vacíos, con el mismo estilo que el resto de
// tablas del proyecto (StockColumns).
const Dash = () => (
  <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
);

// ── Columnas de la tabla del reporte de existencias ──────────────────────────

export const stockReportColumns: ColumnDef<StockReportRow>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    meta: { label: "SKU" },
    cell: ({ row }) =>
      row.original.sku ? (
        <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
          {row.original.sku}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "producto_nombre",
    header: "Producto",
    meta: { label: "Producto" },
    cell: ({ row }) =>
      row.original.producto_nombre ? (
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug line-clamp-2">
          {row.original.producto_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "color",
    header: "Color",
    meta: { label: "Color" },
    cell: ({ row }) =>
      row.original.color ? (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 capitalize">
          {row.original.color.toLowerCase()}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    accessorKey: "talla",
    header: "Talla",
    meta: { label: "Talla" },
    cell: ({ row }) =>
      row.original.talla ? (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
          {row.original.talla}
        </span>
      ) : (
        <Dash />
      ),
  },
  {
    // Siempre es el almacén seleccionado hoy (gate de un solo almacén), pero se
    // incluye por claridad y para el día que el gate soporte multi-almacén.
    accessorKey: "almacen_nombre",
    header: "Almacén",
    meta: { label: "Almacén" },
    cell: ({ row }) =>
      row.original.almacen_nombre ? (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row.original.almacen_nombre}
        </span>
      ) : (
        <Dash />
      ),
  },
  quantityColumn("existencia_inicial", "Exist. Inicial"),
  quantityColumn("entradas", "Entradas"),
  quantityColumn("salidas", "Salidas"),
  quantityColumn("existencia_final", "Exist. Final"),
  currencyColumn("costo_unitario_final", "Costo Unitario"),
  currencyColumn("costo_existencia_final", "Costo Total"),
];
