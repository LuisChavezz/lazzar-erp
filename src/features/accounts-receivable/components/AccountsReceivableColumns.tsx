"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountsReceivable } from "../interfaces/accounts-receivable.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<AccountsReceivable>();

const ActionsCell = () => {
  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {},
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => {},
    },
  ];

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} />
    </div>
  );
};

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
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: () => <ActionsCell />,
  }),
] as ColumnDef<AccountsReceivable>[];

