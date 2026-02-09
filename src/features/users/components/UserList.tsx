"use client";

import { useUsers } from "../hooks/useUsers";
import { DataTable } from "@/src/components/DataTable";
import { userColumns } from "./UserColumns";

export default function UserList() {
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
    />
  );
}
