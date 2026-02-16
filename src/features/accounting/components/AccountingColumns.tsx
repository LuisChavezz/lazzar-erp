"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountingEntry } from "../interfaces/accounting-entry.interface";

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
] as ColumnDef<AccountingEntry>[];

