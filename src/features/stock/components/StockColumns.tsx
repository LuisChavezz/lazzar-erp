"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StockItem } from "../interfaces/stock.interface";
import { HistoryIcon } from "../../../components/Icons";
import { WmsStockHistoryDialog } from "../../wms/components/WmsStockHistoryDialog";

const ActionsCell = ({ stock }: { stock: StockItem }) => {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const actionItems: ActionMenuItem[] = [
    {
      label: "Ver historial",
      icon: HistoryIcon,
      onSelect: () => setIsHistoryOpen(true),
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={actionItems} ariaLabel="Acciones de existencias" />
      <WmsStockHistoryDialog
        open={isHistoryOpen}
        onOpenChange={setIsHistoryOpen}
        stockItem={stock}
      />
    </div>
  );
};

const randomSeed = Date.now();

const getRandomQuantity = (stock: StockItem) => {
  const seed = Number(stock.id) || 1;
  return ((randomSeed + seed * 37) % 900) + 10;
};

export const stockColumns: ColumnDef<StockItem>[] = [
  {
    id: "producto",
    accessorFn: (row) => row.producto_info.nombre ?? "",
    header: "Producto",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.original.producto_info.nombre ?? ""}
      </span>
    ),
  },
  {
    id: "almacen",
    accessorFn: (row) => row.almacen_info.nombre ?? "",
    header: "Almacén",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.original.almacen_info.nombre ?? ""}
      </span>
    ),
  },
  {
    id: "ubicacion",
    accessorFn: (row) =>
      ((row.ubicacion_info as StockItem["ubicacion_info"] & { nombre_completo?: string })
        .nombre_completo ??
        ""),
    header: "Ubicación",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {(row.original.ubicacion_info as StockItem["ubicacion_info"] & { nombre_completo?: string })
          .nombre_completo ?? ""}
      </span>
    ),
  },
  {
    id: "cantidad",
    accessorFn: (row) => getRandomQuantity(row),
    header: "Cantidad",
    cell: ({ row }) => (
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {getRandomQuantity(row.original).toLocaleString("es-MX")}
      </span>
    ),
  },
  {
    id: "unidad",
    accessorFn: () => "unknown",
    header: "Unidad",
    cell: () => <span className="text-slate-600 dark:text-slate-300">unknown</span>,
  },
  {
    id: "ultimo_movimiento",
    accessorFn: () => "Hoy, 10:00 AM",
    header: "Último movimiento",
    cell: () => <span className="text-slate-500 dark:text-slate-400">Hoy, 10:00 AM</span>,
  },
  {
    id: "actions",
    header: "",
    size: 90,
    cell: ({ row }) => <ActionsCell stock={row.original} />,
  },
];
