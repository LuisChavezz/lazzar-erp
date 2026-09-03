"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getColumns } from "./ShiftColumns";
import { Shift } from "../interfaces/shift.interface";
import ShiftForm from "./ShiftForm";
import { useShifts } from "../hooks/useShifts";

export default function ShiftList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const { shifts, isLoading, isError, error } = useShifts();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (shift: Shift) => {
      setSelectedShift(shift);
      setIsDialogOpen(true);
    },
    [setSelectedShift, setIsDialogOpen]
  );

  const handleNew = () => {
    setSelectedShift(null);
    setIsDialogOpen(true);
  };

  const columns = useMemo(
    () => getColumns(handleEdit, { canEdit: canEditHr, canDelete: canDeleteHr }),
    [handleEdit, canEditHr, canDeleteHr]
  );

  return (
    <DataTable
      columns={columns}
      data={shifts}
      // Ata la identidad de la fila al id del registro y no a su índice: las
      // celdas guardan el estado de su diálogo, y al desactivar cambia `activo`
      // y con él el orden.
      getRowId={(row) => String(row.id)}
      searchPlaceholder="Buscar turno..."
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar turnos"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando turnos"
      actionButton={
        canEditHr ? (
          <MainDialog
            title={
              <DialogHeader
                title={selectedShift ? "Editar Turno" : "Alta de Turno"}
                subtitle={selectedShift ? "Edición de registro" : "Registro Nuevo"}
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
                + Nuevo Turno
              </Button>
            }
          >
            <ShiftForm onSuccess={() => setIsDialogOpen(false)} shiftToEdit={selectedShift} />
          </MainDialog>
        ) : null
      }
    />
  );
}
