"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Company } from "../interfaces/company.interface";
import { EditIcon, DeleteIcon } from "../../../components/Icons";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { MainDialog } from "@/src/components/MainDialog";
import CompanyForm from "./CompanyForm";
import { useState } from "react";

// Componente para renderizar las acciones de editar y eliminar
const ActionsCell = ({ company }: { company: Company }) => {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = () => {
    // TODO: Implement delete functionality
    console.log("Delete company", company);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <MainDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Edición de Empresa
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Modificar Registro
                </p>
              </div>
            </div>
          </div>
        }
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        }
      >
        <CompanyForm 
          onSuccess={() => setIsEditOpen(false)} 
          initialData={company}
        />
      </MainDialog>

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
