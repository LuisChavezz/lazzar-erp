"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BankAccount } from "../interfaces/bank-account.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<BankAccount>();

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
    cell: () => <ActionsCell />,
  }),
] as ColumnDef<BankAccount>[];
