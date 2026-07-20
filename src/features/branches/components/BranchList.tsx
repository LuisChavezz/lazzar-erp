"use client";

// import { useState } from "react";
import { useBranches } from "../hooks/useBranches";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
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
  const canReadConfig = isAdmin || permissions.includes("R-CONFIGURACION");
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");

  // const handleNew = () => {
  //   setIsDialogOpen(true);
  // };

  return (
    <DataTable
      columns={getBranchColumns({ canRead: canReadConfig, canEdit: canEditConfig })}
      data={branches}
      title="Sucursales"
      searchPlaceholder="Buscar sucursal..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar sucursales"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando sucursales"
    />
  );
}
