"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useAreas } from "@/src/features/areas/hooks/useAreas";
import { getColumns } from "./PositionColumns";
import { Position } from "../interfaces/position.interface";
import PositionForm from "./PositionForm";
import { usePositions } from "../hooks/usePositions";

export default function PositionList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const { positions, isLoading, isError, error } = usePositions();
  const { areas } = useAreas();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (position: Position) => {
      setSelectedPosition(position);
      setIsDialogOpen(true);
    },
    [setSelectedPosition, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedPosition(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditHr, canDelete: canDeleteHr }, areas),
    [handleEdit, canEditHr, canDeleteHr, areas]
  );

  return (
    <DataTable
      columns={columns}
      data={positions}
      searchPlaceholder="Buscar puesto..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar puestos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando puestos"
      actionButton={
        canEditHr ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedPosition ? "Editar Puesto" : "Alta de Puesto"}
                subtitle={selectedPosition ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Puesto
              </Button>
            }
          >
            <PositionForm
              onSuccess={() => setIsDialogOpen(false)}
              positionToEdit={selectedPosition}
            />
          </MainDialog>
        ) : null
      }
    />
  );
}
