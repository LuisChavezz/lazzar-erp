"use client";

import { useRoles } from "../hooks/useRoles";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
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
      <ErrorState title="Error al cargar roles" message={(error as Error).message} />
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
