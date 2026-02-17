"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BankAccount } from "../interfaces/bank-account.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const columnHelper = createColumnHelper<BankAccount>();

export const bankAccountsColumns = [
  columnHelper.accessor("accountNumber", {
    header: "Cuenta",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("bank", {
    header: "Banco",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("owner", {
    header: "Titular",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("currency", {
    header: "Moneda",
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
] as ColumnDef<BankAccount>[];
