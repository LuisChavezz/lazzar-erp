"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InventoryItem } from "../interfaces/inventory.interface";

const StockBadge = ({ status }: { status: InventoryItem["status"] }) => {
  const styles = {
    "Optimal": "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    "Low": "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    "Out": "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    "Warning": "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  };
  
  const labels = {
    "Optimal": "Óptimo",
    "Low": "Bajo",
    "Out": "Agotado",
    "Warning": "Alerta",
  };
  
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const inventoryColumns: ColumnDef<InventoryItem>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("sku")}
      </span>
    ),
  },
  {
    accessorKey: "name",
    header: "Producto",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-700 dark:text-slate-200 font-medium">
          {row.getValue("name")}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Min: {row.original.minStock} {row.original.unit}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Categoría",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("category")}
      </span>
    ),
  },
  {
    accessorKey: "stock",
    header: "Existencia",
    cell: ({ row }) => (
      <div className="font-semibold text-slate-700 dark:text-slate-200">
        {row.original.stock.toLocaleString("es-MX")}
      </div>
    ),
  },
  {
    accessorKey: "unit",
    header: "Unidad",
    cell: ({ row }) => (
      <span className="text-slate-500 dark:text-slate-400 text-xs uppercase">
        {row.getValue("unit")}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => <StockBadge status={row.getValue("status")} />,
  },
];
