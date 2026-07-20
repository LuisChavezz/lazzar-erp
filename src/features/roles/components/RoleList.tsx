"use client";

import { useRoles } from "../hooks/useRoles";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { roleColumns } from "./RoleColumns";

export default function RoleList() {
  const { data: roles, isLoading, isError, error } = useRoles();

  return (
    <DataTable
      columns={roleColumns}
      data={roles ?? []}
      title="Roles"
      searchPlaceholder="Buscar rol..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar roles"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando roles"
    />
  );
}
