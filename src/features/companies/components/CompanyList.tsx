"use client";

import { useCompanies } from "../hooks/useCompanies";
import { DataTable } from "@/src/components/DataTable";
import { companyColumns } from "./CompanyColumns";

export default function CompanyList() {
  const { data: companies, isLoading, isError, error } = useCompanies();

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
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar empresas</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  if (!companies) return null;

  return (
    <DataTable
      columns={companyColumns}
      data={companies}
      title="Empresas"
      searchPlaceholder="Buscar empresa..."
    />
  );
}
