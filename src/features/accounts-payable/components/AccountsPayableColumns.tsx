import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountsPayable } from "../interfaces/accounts-payable.interface";

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
] as ColumnDef<AccountsPayable>[];
