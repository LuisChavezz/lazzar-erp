import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { Product } from "@/src/features/products/interfaces/product.interface";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";

const columnHelper = createColumnHelper<Product>();

/**
 * Columnas de Materiales (productos de materia prima) en MODO SERVIDOR
 * (EC-897): cada una ordena en el servidor por su campo de la lista blanca de
 * `catalogo/producto/` (`serverSort`). Sin filtros de encabezado, como antes.
 */

export const columns = [
  columnHelper.accessor((row) => row.activo, {
    id: "activo",
    header: "Estado",
    size: 100,
    meta: { label: "Estado", serverSort: "activo" },
    cell: ({ row }) => {
      const isActive = row.original.activo;
      const styles = isActive
        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
        : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}>
          {isActive ? "Activo" : "Inactivo"}
        </span>
      );
    },
  }),
  columnHelper.accessor("nombre", {
    header: "Nombre",
    size: 200,
    meta: { label: "Nombre", serverSort: "nombre" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
    ),
  }),
  // Nullable: un producto que no pasó por el alta rápida puede no tener código.
  columnHelper.accessor((row) => row.codigo ?? "", {
    id: "codigo",
    header: "Código",
    meta: { label: "Código", serverSort: "codigo" },
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400">{textOrDash(row.original.codigo)}</span>
    ),
  }),
  columnHelper.accessor("cod_proscai", {
    header: "Cód. Proscai",
    meta: { label: "Cód. Proscai", serverSort: "cod_proscai" },
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("precio_base", {
    header: "Precio",
    meta: { align: "right", label: "Precio", serverSort: "precio_base" },
    // Sin símbolo: `precio_base` no declara moneda (EC-606).
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 font-medium">
        {formatMoneyValue(row.original.precio_base, null)}
      </span>
    ),
  }),
] as ColumnDef<Product>[];
