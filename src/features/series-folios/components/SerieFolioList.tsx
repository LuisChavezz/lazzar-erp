"use client";

import { useMemo, useState, useCallback } from "react";
import { DataTable } from "../../../components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { Button } from "../../../components/Button";
import { MainDialog } from "../../../components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
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

  // `hasPermission` ya cortocircuita para el rol admin, así que sustituye al
  // chequeo manual que vivía aquí. El alta usa su propio código
  // (C-CONFIGURACION), no el de edición.
  const canCreate = hasPermission("C-CONFIGURACION", session?.user);
  const canEdit = hasPermission("E-CONFIGURACION", session?.user);
  const canDelete = hasPermission("D-CONFIGURACION", session?.user);

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
      getSerieFolioColumns(handleEdit, { canEdit, canDelete }, branchLookup),
    [handleEdit, canEdit, canDelete, branchLookup]
  );

  return (
    <DataTable
      columns={columns}
      data={seriesFolios ?? []}
      title="Series y Folios"
      searchPlaceholder="Buscar serie, documento o sucursal..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar series y folios"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando series y folios"
      actionButton={
        // El diálogo es DUAL (alta y edición: lo abre `handleEdit` por `open`,
        // sin pasar por el trigger), así que se monta también con solo permiso
        // de edición; lo que se oculta sin `canCreate` es el botón de alta.
        canCreate || canEdit ? (
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
              canCreate ? (
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nueva Serie
                </Button>
              ) : undefined
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
