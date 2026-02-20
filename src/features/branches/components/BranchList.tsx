"use client";

// import { useState } from "react";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/src/components/DataTable";
import { getBranchColumns } from "./BranchColumns";
import { useSession } from "next-auth/react";
// import { MainDialog } from "@/src/components/MainDialog";
// import BranchForm from "./BranchForm";

export default function BranchList() {
  // const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { branches, isLoading, isError, error } = useBranches();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canReadConfig = isAdmin || permissions.includes("R-CONF");
  const canEditConfig = isAdmin || permissions.includes("E-CONF");

  // const handleNew = () => {
  //   setIsDialogOpen(true);
  // };

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
      columns={getBranchColumns({ canRead: canReadConfig, canEdit: canEditConfig })}
      data={branches}
      title="Sucursales"
      searchPlaceholder="Buscar sucursal..."
    />
  );
}
