import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Product } from "@/src/features/products/interfaces/product.interface";

const columnHelper = createColumnHelper<Product>();

export const columns = [
  columnHelper.accessor((row) => row.activo, {
    id: "activo",
    header: "Estado",
    size: 100,
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
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("codigo", {
    header: "Código",
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("cod_proscai", {
    header: "Cód. Proscai",
    cell: (info) => (
      <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("precio_base", {
    header: "Precio",
    cell: ({ row }) => {
      const value = row.original.precio_base;
      const formatted = new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN",
      }).format(parseFloat(value));
      return <span className="text-slate-600 dark:text-slate-300 font-medium">{formatted}</span>;
    },
  }),
] as ColumnDef<Product>[];
