"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Company } from "../interfaces/company.interface";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

// Componente para renderizar las acciones de editar y eliminar (sin funcionalidad por ahora)
const ActionsCell = ({ company }: { company: Company }) => {
  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log("Edit company", company);
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log("Delete company", company);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
        title="Editar"
        onClick={handleEdit}
      >
        <EditIcon className="w-5 h-5" />
      </button>
      <ConfirmDialog
        title="Eliminar Empresa"
        description="¿Estás seguro de que deseas eliminar esta empresa? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        confirmColor="red"
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-red-600 transition-colors"
            title="Eliminar"
          >
            <DeleteIcon className="w-5 h-5" />
          </button>
        }
      />
    </div>
  );
};

export const companyColumns: ColumnDef<Company>[] = [
  {
    accessorKey: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
        {row.getValue("codigo")}
      </span>
    ),
  },
  {
    accessorKey: "razon_social",
    header: "Razón Social",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-white">
          {row.getValue("razon_social")}
        </span>
        {row.original.nombre_comercial && (
          <span className="text-xs text-slate-500">
            {row.original.nombre_comercial}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "rfc",
    header: "RFC",
    cell: ({ row }) => (
      <span className="font-mono text-slate-600 dark:text-slate-400">
        {row.getValue("rfc")}
      </span>
    ),
  },
  {
    accessorKey: "email_contacto",
    header: "Contacto",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.getValue("email_contacto")}
        </span>
        {row.original.telefono && (
          <span className="text-xs text-slate-500">
            {row.original.telefono}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => {
      const status = row.getValue("estatus") as string;
      const styles =
        status === "activo"
          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400";
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles}`}
        >
          {status}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell company={row.original} />,
  },
];
