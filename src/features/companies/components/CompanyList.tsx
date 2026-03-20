"use client";

import { useMemo } from "react";
import { useCompanies } from "../hooks/useCompanies";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
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

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando empresas...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState title="Error al cargar empresas" message={(error as Error).message} />
    );
  }

  if (!companies) return null;

  return (
    <DataTable
      columns={columns}
      data={companies}
      title="Empresas"
      searchPlaceholder="Buscar empresa..."
    />
  );
}
