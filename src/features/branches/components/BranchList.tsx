"use client";

// import { useState } from "react";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/src/components/DataTable";
import { ErrorState } from "@/src/components/ErrorState";
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
      <ErrorState title="Error al cargar sucursales" message={(error as Error).message} />
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
