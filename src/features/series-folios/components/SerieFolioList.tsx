"use client";

import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { ErrorState } from "../../../components/ErrorState";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { useSession } from "next-auth/react";
import { useWorkspaceStore } from "../../workspace/store/workspace.store";
import { useCompanyBranches } from "../../branches/hooks/useCompanyBranches";
import { useSerieFolios } from "../hooks/useSerieFolios";
import { getSerieFolioColumns } from "./SerieFolioColumns";
import SerieFolioForm from "./SerieFolioForm";
import { SerieFolio } from "../interfaces/serie-folio.interface";

export default function SerieFolioList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSerieFolio, setSelectedSerieFolio] = useState<SerieFolio | null>(null);
  const { data: seriesFolios, isLoading, isError, error } = useSerieFolios();
  const { data: session } = useSession();
  const selectedCompany = useWorkspaceStore((state) => state.selectedCompany);
  const { branches } = useCompanyBranches(selectedCompany.id);

  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditConfig = isAdmin || permissions.includes("E-CONFIGURACION");
  const canDeleteConfig = isAdmin || permissions.includes("D-CONFIGURACION");

  const branchLookup = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.nombre])),
    [branches]
  );

  const handleEdit = useCallback(
    (serieFolio: SerieFolio) => {
      setSelectedSerieFolio(serieFolio);
      setIsDialogOpen(true);
    },
    [setSelectedSerieFolio]
  );

  const handleNew = useCallback(() => {
    setSelectedSerieFolio(null);
    setIsDialogOpen(true);
  }, []);

  const columns = useMemo(
    () =>
      getSerieFolioColumns(handleEdit, { canEdit: canEditConfig, canDelete: canDeleteConfig }, branchLookup),
    [handleEdit, canEditConfig, canDeleteConfig, branchLookup]
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
        <span className="ml-3 text-slate-500">Cargando series y folios...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Error al cargar series y folios"
        message={(error as Error).message}
      />
    );
  }

  if (!seriesFolios) return null;

  return (
    <DataTable
      columns={columns}
      data={seriesFolios}
      title="Series y Folios"
      searchPlaceholder="Buscar serie o documento..."
      actionButton={
        canEditConfig ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedSerieFolio ? "Editar Serie y Folio" : "Alta de Serie y Folio"}
                subtitle={selectedSerieFolio ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1100px"
            trigger={
              <button
                onClick={handleNew}
                className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
              >
                + Nueva Serie
              </button>
            }
          >
            <SerieFolioForm
              onSuccess={() => setIsDialogOpen(false)}
              serieFolioToEdit={selectedSerieFolio}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
