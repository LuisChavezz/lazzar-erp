"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { Receipt } from "../interfaces/receipt.interface";
import { ViewIcon } from "@/src/components/Icons";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<Receipt>();

const ActionsCell = () => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {},
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

export const receiptColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("proveedor", {
    header: "Proveedor",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200 text-sm">
        #{info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_recepcion", {
    header: "Fecha Recepción",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {info.getValue()
          ? new Date(info.getValue()).toLocaleDateString("es-MX")
          : "—"}
      </span>
    ),
  }),
  columnHelper.accessor("remision", {
    header: "Remisión",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("factura_referencia", {
    header: "Factura",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300">
        {info.getValue() ?? "—"}
      </span>
    ),
  }),
  columnHelper.accessor("estatus", {
    header: "Estatus",
    cell: (info) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400">
        Estatus {info.getValue()}
      </span>
    ),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => <ActionsCell />,
  }),
] as ColumnDef<Receipt>[];
