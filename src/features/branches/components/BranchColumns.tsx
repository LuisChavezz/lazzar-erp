"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Branch } from "../interfaces/branch.interface";
import { EditIcon, ViewIcon } from "../../../components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { BranchDetails } from "./BranchDetails";
import { useState } from "react";
import BranchForm from "./BranchForm";

const ActionsCell = ({ branch }: { branch: Branch }) => {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <div className="flex items-center justify-center gap-2">
      <MainDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Detalles de Sucursal
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Información Completa
                </p>
              </div>
            </div>
          </div>
        }
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
            title="Ver Detalles"
          >
            <ViewIcon className="w-5 h-5" />
          </button>
        }
      >
        <BranchDetails branch={branch} />
      </MainDialog>

      <MainDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Editar Sucursal
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Actualizar Información
                </p>
              </div>
            </div>
          </div>
        }
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-orange-600 transition-colors"
            title="Editar"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        }
      >
        <BranchForm 
          onSuccess={() => setIsEditOpen(false)} 
          defaultValues={branch}
        />
      </MainDialog>
    </div>
  );
};

export const branchColumns: ColumnDef<Branch>[] = [
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
    accessorKey: "nombre",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium text-slate-900 dark:text-white">
        {row.getValue("nombre")}
      </span>
    ),
  },
  {
    accessorKey: "ciudad",
    header: "Ubicación",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-slate-900 dark:text-white">
          {row.getValue("ciudad") || "-"}
        </span>
        <span className="text-xs text-slate-500">
          {row.original.estado}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Contacto",
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.original.email}
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
    cell: ({ row }) => <ActionsCell branch={row.original} />,
  },
];
