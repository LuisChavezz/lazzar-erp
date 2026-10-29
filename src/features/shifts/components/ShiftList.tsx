"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ClockIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { getColumns, SHIFT_HEADER_FILTERS } from "./ShiftColumns";
import { Shift } from "../interfaces/shift.interface";
import ShiftForm from "./ShiftForm";
import { useShifts } from "../hooks/useShifts";
import { useDeleteShift } from "../hooks/useDeleteShift";
import { ShiftRowActionsProvider, usePendingShiftIds } from "../hooks/useShiftRowActions";
import { SHIFT_STALE_MESSAGES } from "../utils/shiftStaleMessages";

export default function ShiftList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado completo — la baja
  // cambia `activo`, que es un filtro, y puede sacar la fila de la vista.
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const { shifts, isLoading, isInitialError, error } = useShifts();
  const { mutate: deactivateShift, isPending: isDeactivatePending } = useDeleteShift();
  const busyIds = usePendingShiftIds();
  // Aviso del diálogo de fila que se cerró porque su turno cambió por fuera.
  // Se dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (shift: Shift) => {
    setSelectedShift(shift);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedShift(null);
    setIsDialogOpen(true);
  };

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `ShiftRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    shifts,
    SHIFT_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deactivateTarget =
    deactivateTargetId !== null ? (shifts.find((shift) => shift.id === deactivateTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeactivating =
    deactivateTargetId !== null && (busyIds.includes(deactivateTargetId) || isDeactivatePending);

  // Vía rápida contra la caché: un refetch mostró que el turno del diálogo
  // abierto ya no existe o ya está inactivo. Se cierra con un aviso (mismo
  // patrón que `EmployeeList`). Ajuste en render, no en un efecto.
  const staleDeactivate = getStaleRowDialogNotice({
    resource: "shift",
    targetId: deactivateTargetId,
    target: deactivateTarget,
    expectedActivo: true,
    isBusy: isDeactivating,
    messages: SHIFT_STALE_MESSAGES,
  });
  if (staleDeactivate) {
    setDeactivateTargetId(null);
    setStaleNotice(staleDeactivate);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia del turno al ABRIR la confirmación: el texto no sigue a los refetch y
  // sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deactivateSession = useDialogSession(deactivateTargetId !== null, deactivateTarget);

  return (
    <ShiftRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDeactivate: (shift) => setDeactivateTargetId(shift.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={shifts}
        // Ata la identidad de la fila al id del registro y no a su índice:
        // desactivar cambia `activo`, que es un filtro.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar turno..."
        isLoading={isLoading}
        isError={isInitialError}
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
                  icon={ClockIcon}
                />
              }
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              maxWidth={DIALOG_WIDTH_FORM}
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

      {/*
        Montado mientras haya una copia: `open` sale del id, así que al
        cerrarse anima su salida con el nombre de la apertura.
      */}
      {canDeleteHr && deactivateSession.snapshot && (
        <ConfirmDialog
          key={deactivateSession.id}
          open={deactivateTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeactivateTargetId(null);
          }}
          title="Desactivar Turno"
          description={`¿Deseas desactivar el turno ${deactivateSession.snapshot.nombre}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() => {
            const id = deactivateSession.snapshot?.id;
            if (id === undefined) return;
            deactivateShift(id, {
              onSettled: () => setDeactivateTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
    </ShiftRowActionsProvider>
  );
}
