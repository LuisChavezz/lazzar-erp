"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountsReceivable } from "../interfaces/accounts-receivable.interface";

const columnHelper = createColumnHelper<AccountsReceivable>();

export const accountsReceivableColumns = [
  columnHelper.accessor("invoiceNumber", {
    header: "Factura",
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor("customer.name", {
    header: "Cliente",
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
] as ColumnDef<AccountsReceivable>[];

