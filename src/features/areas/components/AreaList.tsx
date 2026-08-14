"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { getColumns } from "./AreaColumns";
import { Area } from "../interfaces/area.interface";
import AreaForm from "./AreaForm";
import { useAreas } from "../hooks/useAreas";

export default function AreaList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const { areas, isLoading, isError, error } = useAreas();
  const { departments } = useDepartments();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canEditHr = isAdmin || permissions.includes("E-RH");
  const canDeleteHr = isAdmin || permissions.includes("D-RH");

  const handleEdit = useCallback(
    (area: Area) => {
      setSelectedArea(area);
      setIsDialogOpen(true);
    },
    [setSelectedArea, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedArea(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditHr, canDelete: canDeleteHr }, departments),
    [handleEdit, canEditHr, canDeleteHr, departments]
  );

  return (
    <DataTable
      columns={columns}
      data={areas}
      searchPlaceholder="Buscar área..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar áreas"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando áreas"
      actionButton={
        canEditHr ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedArea ? "Editar Área" : "Alta de Área"}
                subtitle={selectedArea ? "Edición de registro" : "Registro Nuevo"}
                statusColor="emerald"
              />
            }
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            maxWidth="1000px"
            trigger={
              <Button
                variant="primary"
                rounded="full"
                onClick={handleNew}
                className="hover:scale-105 active:scale-95"
              >
                + Nueva Área
              </Button>
            }
          >
            <AreaForm onSuccess={() => setIsDialogOpen(false)} areaToEdit={selectedArea} />
          </MainDialog>
        ) : null
      }
    />
  );
}
