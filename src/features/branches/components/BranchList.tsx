"use client";

import { useState } from "react";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/src/components/DataTable";
import { branchColumns } from "./BranchColumns";
import { MainDialog } from "@/src/components/MainDialog";
import BranchForm from "./BranchForm";

export default function BranchList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { branches, isLoading, isError, error } = useBranches();

  const handleNew = () => {
    setIsDialogOpen(true);
  };

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
      actionButton={
        <MainDialog
          title="Nueva Sucursal"
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="1000px"
          trigger={
            <button
              onClick={handleNew}
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              + Nueva Sucursal
            </button>
          }
        >
          <BranchForm onSuccess={() => setIsDialogOpen(false)} />
        </MainDialog>
      }
    />
  );
}
