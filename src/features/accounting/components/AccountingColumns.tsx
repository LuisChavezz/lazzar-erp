"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountingEntry } from "../interfaces/accounting-entry.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const columnHelper = createColumnHelper<AccountingEntry>();

export const accountingColumns = [
  columnHelper.accessor("documentNumber", {
    header: "Documento",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("type", {
    header: "Tipo",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("date", {
    header: "Fecha",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("account", {
    header: "Cuenta Contable",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("debit", {
    header: "Cargo",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("credit", {
    header: "Abono",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("balance", {
    header: "Saldo",
    cell: (info) => info.getValue(),
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => (
      <div className="flex items-center justify-center gap-2">
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Ver Detalles"
        >
          <ViewIcon className="w-5 h-5" />
        </button>
        <button
          className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
          title="Editar"
        >
          <EditIcon className="w-5 h-5" />
        </button>
      </div>
    ),
  }),
] as ColumnDef<AccountingEntry>[];
