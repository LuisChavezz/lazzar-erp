"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BankAccount } from "../interfaces/bank-account.interface";

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
] as ColumnDef<BankAccount>[];

