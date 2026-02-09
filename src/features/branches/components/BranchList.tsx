"use client";

import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/src/components/DataTable";
import { branchColumns } from "./BranchColumns";

export default function BranchList() {
  const { branches, isLoading, isError, error } = useBranches();

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando sucursales...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-600">
        <p className="font-medium">Error al cargar sucursales</p>
        <p className="text-sm opacity-80">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <DataTable
      columns={branchColumns}
      data={branches}
      title="Sucursales"
      searchPlaceholder="Buscar sucursal..."
    />
  );
}
