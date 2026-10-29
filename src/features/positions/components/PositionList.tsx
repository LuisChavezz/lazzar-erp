"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { ClipboardListIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useAreas } from "@/src/features/areas/hooks/useAreas";
import { getColumns, POSITION_HEADER_FILTERS } from "./PositionColumns";
import { Position } from "../interfaces/position.interface";
import PositionForm from "./PositionForm";
import { usePositions } from "../hooks/usePositions";
import { useDeletePosition } from "../hooks/useDeletePosition";
import { PositionRowActionsProvider, usePendingPositionIds } from "../hooks/usePositionRowActions";
import { buildPositionRows, POSITION_STALE_MESSAGES } from "../utils/positionRows";

export default function PositionList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado completo — la baja
  // cambia `activo`, que es un filtro, y puede sacar la fila de la vista.
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const { positions, isLoading, isInitialError, error } = usePositions();
  const { areas } = useAreas();
  const { mutate: deactivatePosition, isPending: isDeactivatePending } = useDeletePosition();
  const busyIds = usePendingPositionIds();
  // Aviso del diálogo de fila que se cerró porque su puesto cambió por fuera.
  // Se dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (position: Position) => {
    setSelectedPosition(position);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedPosition(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const areaNameById = new Map(areas.map((area) => [area.id, area.nombre]));

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de áreas produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda, orden y opciones de filtro. Ver `PositionRow`.
  const rows = buildPositionRows(positions, areaNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `PositionRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    POSITION_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deactivateTarget =
    deactivateTargetId !== null ? (rows.find((row) => row.id === deactivateTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeactivating =
    deactivateTargetId !== null && (busyIds.includes(deactivateTargetId) || isDeactivatePending);

  // Vía rápida contra la caché: un refetch mostró que el puesto del diálogo
  // abierto ya no existe o ya está inactivo. Se cierra con un aviso (mismo
  // patrón que `EmployeeList`). Ajuste en render, no en un efecto.
  const staleDeactivate = getStaleRowDialogNotice({
    resource: "position",
    targetId: deactivateTargetId,
    target: deactivateTarget,
    expectedActivo: true,
    isBusy: isDeactivating,
    messages: POSITION_STALE_MESSAGES,
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

  // Copia del puesto al ABRIR la confirmación: el texto no sigue a los refetch
  // y sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deactivateSession = useDialogSession(deactivateTargetId !== null, deactivateTarget);

  return (
    <PositionRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDeactivate: (position) => setDeactivateTargetId(position.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice:
        // desactivar cambia `activo`, que es un filtro.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar puesto..."
        isLoading={isLoading}
        isError={isInitialError}
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
                  icon={ClipboardListIcon}
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
          title="Desactivar Puesto"
          description={`¿Deseas desactivar el puesto ${deactivateSession.snapshot.nombre}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() => {
            const id = deactivateSession.snapshot?.id;
            if (id === undefined) return;
            deactivatePosition(id, {
              onSettled: () => setDeactivateTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
    </PositionRowActionsProvider>
  );
}
