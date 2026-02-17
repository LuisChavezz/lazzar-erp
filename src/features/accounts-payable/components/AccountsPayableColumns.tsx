"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountsPayable } from "../interfaces/accounts-payable.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const columnHelper = createColumnHelper<AccountsPayable>();

export const accountsPayableColumns = [
  columnHelper.accessor("invoiceNumber", {
    header: "Factura",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("supplier.name", {
    header: "Proveedor",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("amount", {
    header: "Monto",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("balance", {
    header: "Saldo",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("dueDate", {
    header: "Vencimiento",
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
] as ColumnDef<AccountsPayable>[];
