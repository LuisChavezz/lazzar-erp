"use client";

import { ColumnDef } from "@tanstack/react-table";
// import { useQueryClient } from "@tanstack/react-query";
// import { useRouter } from "next/navigation";
import { Customer } from "../interfaces/customer.interface";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { EditIcon, ViewIcon } from "../../../components/Icons";

const ActionsCell = ({
  customer,
  onEdit,
}: {
  customer: Customer;
  onEdit: (customer: Customer) => void;
}) => {
  // const router = useRouter();
  // const queryClient = useQueryClient();
  const items: ActionMenuItem[] = [
    {
      label: "Ver Detalles",
      icon: ViewIcon,
      onSelect: () => {
        // queryClient.setQueryData(["customer", customer.id], customer);
        // router.push(`/sales/customers/${customer.id}`);
      },
    },
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(customer),
    },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={items} ariaLabel="Acciones de cliente" />
    </div>
  );
};

export const getCustomerColumns = (
  onEdit: (customer: Customer) => void
): ColumnDef<Customer>[] => [
  {
    accessorKey: "razon_social",
    header: "Razón social",
    cell: ({ row }) => (
      <span className="font-medium text-slate-700 dark:text-slate-200">
        {row.getValue("razon_social")}
      </span>
    ),
  },
  {
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("nombre")}
      </span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("telefono")}
      </span>
    ),
  },
  {
    accessorKey: "correo",
    header: "Correo",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("correo")}
      </span>
    ),
  },
  {
    accessorKey: "activo",
    header: "Estatus",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("activo") ? "Activo" : "Inactivo"}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    size: 90,
    cell: ({ row }) => <ActionsCell customer={row.original} onEdit={onEdit} />,
  },
];
