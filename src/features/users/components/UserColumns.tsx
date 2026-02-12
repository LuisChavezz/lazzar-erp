"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "../interfaces/user.interface";
import { ViewIcon, EditIcon } from "../../../components/Icons";
import { MainDialog } from "@/src/components/MainDialog";
import { UserDetails } from "./UserDetails";
import { useState } from "react";
import UserForm from "./UserForm";

const ActionsCell = ({ user }: { user: User }) => {
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
                Detalles de Usuario
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
        <UserDetails user={user} />
      </MainDialog>

      <MainDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        maxWidth="1000px"
        title={
          <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/10 mb-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display tracking-tight">
                Editar Usuario
              </h1>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Actualizar información
                </p>
              </div>
            </div>
          </div>
        }
        trigger={
          <button
            className="p-1 cursor-pointer text-slate-400 hover:text-sky-600 transition-colors"
            title="Editar"
          >
            <EditIcon className="w-5 h-5" />
          </button>
        }
      >
        <UserForm onSuccess={() => setIsEditOpen(false)} defaultValues={user} />
      </MainDialog>
    </div>
  );
};

export const userColumns: ColumnDef<User>[] = [
  {
    accessorKey: "username",
    header: "Usuario",
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-white">
          {row.getValue("username")}
        </span>
        <span className="text-xs text-slate-500">
          {row.original.email}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "first_name",
    header: "Nombre Completo",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {row.original.first_name} {row.original.last_name}
      </span>
    ),
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-sm text-slate-600 dark:text-slate-400">
        {row.getValue("telefono") || "-"}
      </span>
    ),
  },
  {
    accessorKey: "is_admin_empresa",
    header: "Rol",
    cell: ({ row }) => {
      const isAdmin = row.original.is_admin_empresa;
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            isAdmin
              ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
          }`}
        >
          {isAdmin ? "Admin Empresa" : "Usuario"}
        </span>
      );
    },
  },
  {
    accessorKey: "estatus",
    header: "Estatus",
    cell: ({ row }) => {
      const status = row.getValue("estatus") as string;
      const isActive = row.original.is_active;
      
      const styles =
        isActive && status === "activo"
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
    accessorKey: "date_joined",
    header: "Fecha Registro",
    cell: ({ row }) => {
      const date = new Date(row.getValue("date_joined"));
      return (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {date.toLocaleDateString()}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell user={row.original} />,
  },
];
