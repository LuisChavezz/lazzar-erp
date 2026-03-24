"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { AccountingEntry } from "../interfaces/accounting-entry.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";

const columnHelper = createColumnHelper<AccountingEntry>();

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
    cell: () => <ActionsCell />,
  }),
] as ColumnDef<AccountingEntry>[];
