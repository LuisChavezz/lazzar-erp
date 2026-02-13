"use client";

import { useState } from "react";
import { useUsers } from "../hooks/useUsers";
import { DataTable } from "@/src/components/DataTable";
import { userColumns } from "./UserColumns";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import UserForm from "./UserForm";

export default function UserList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: users, isLoading, isError, error } = useUsers();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando usuarios...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar usuarios</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!users) return null;

  return (
    <DataTable
      columns={userColumns}
      data={users}
      title="Usuarios"
      searchPlaceholder="Buscar usuario..."
      actionButton={
        <MainDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="1000px"
          trigger={
            <button
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              + Nuevo Usuario
            </button>
          }
          title={
            <DialogHeader
              title="Registrar Usuario"
              subtitle="Nuevo Registro"
              statusColor="emerald"
            />
          }
        >
          <UserForm onSuccess={() => setIsDialogOpen(false)} />
        </MainDialog>
      }
    />
  );
}
