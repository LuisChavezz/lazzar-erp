"use client";

import { useRoles } from "../hooks/useRoles";
import { DataTable } from "@/src/components/DataTable";
import { roleColumns } from "./RoleColumns";

export default function RoleList() {
  const { data: roles, isLoading, isError, error } = useRoles();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando roles...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar roles</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!roles) return null;

  return (
    <DataTable
      columns={roleColumns}
      data={roles}
      title="Roles"
      searchPlaceholder="Buscar rol..."
    />
  );
}
