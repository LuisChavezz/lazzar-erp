"use client";

import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
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

  return (
    <DataTable
      columns={columns}
      data={seriesFolios ?? []}
      title="Series y Folios"
      searchPlaceholder="Buscar serie o documento..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar series y folios"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando series y folios"
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
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Serie
              </Button>
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
