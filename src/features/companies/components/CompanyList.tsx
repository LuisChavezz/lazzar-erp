"use client";

import { useMemo } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { getCompanyColumns } from "./CompanyColumns";
import { useSession } from "next-auth/react";

export default function CompanyList() {
  const { data: companies, isLoading, isError, error } = useCompanies();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canReadConfig = isAdmin || permissions.includes("R-CONFIGURACION");
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");
  const columns = useMemo(
    () => getCompanyColumns({ canRead: canReadConfig, canEdit: canEditConfig, canDelete: canDeleteConfig }),
    [canReadConfig, canEditConfig, canDeleteConfig]
  );

  return (
    <DataTable
      columns={columns}
      data={companies ?? []}
      title="Empresas"
      searchPlaceholder="Buscar empresa..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar empresas"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando empresas"
    />
  );
}
