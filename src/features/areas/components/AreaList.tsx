"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { LayersIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useDepartments } from "@/src/features/departments/hooks/useDepartments";
import { getColumns, AREA_HEADER_FILTERS } from "./AreaColumns";
import { Area } from "../interfaces/area.interface";
import AreaForm from "./AreaForm";
import { useAreas } from "../hooks/useAreas";
import { useDeleteArea } from "../hooks/useDeleteArea";
import { AreaRowActionsProvider, usePendingAreaIds } from "../hooks/useAreaRowActions";
import { AREA_STALE_MESSAGES, buildAreaRows } from "../utils/areaRows";

export default function AreaList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado completo — la baja
  // cambia `activo`, que es un filtro, y puede sacar la fila de la vista.
  const [deactivateTargetId, setDeactivateTargetId] = useState<number | null>(null);
  const { areas, isLoading, isInitialError, error } = useAreas();
  const { departments } = useDepartments();
  const { mutate: deactivateArea, isPending: isDeactivatePending } = useDeleteArea();
  const busyIds = usePendingAreaIds();
  // Aviso del diálogo de fila que se cerró porque su área cambió por fuera. Se
  // dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = (area: Area) => {
    setSelectedArea(area);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedArea(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  const departmentNameById = new Map(
    departments.map((department) => [department.id_departamento, department.nombre])
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de departamentos produce un `data` nuevo y TanStack recalcula
  // celda, búsqueda, orden y opciones de filtro. Ver `AreaRow`.
  const rows = buildAreaRows(areas, departmentNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `AreaRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    AREA_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deactivateTarget =
    deactivateTargetId !== null ? (rows.find((row) => row.id === deactivateTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isDeactivating =
    deactivateTargetId !== null && (busyIds.includes(deactivateTargetId) || isDeactivatePending);

  // Vía rápida contra la caché: un refetch mostró que el área del diálogo
  // abierto ya no existe o ya está inactiva. Se cierra con un aviso, para que
  // no desaparezca sin explicación (mismo patrón que `EmployeeList`). Ajuste en
  // render, no en un efecto.
  const staleDeactivate = getStaleRowDialogNotice({
    resource: "area",
    targetId: deactivateTargetId,
    target: deactivateTarget,
    expectedActivo: true,
    isBusy: isDeactivating,
    messages: AREA_STALE_MESSAGES,
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

  // Copia del área al ABRIR la confirmación: el texto no sigue a los refetch y
  // sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deactivateSession = useDialogSession(deactivateTargetId !== null, deactivateTarget);

  return (
    <AreaRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDeactivate: (area) => setDeactivateTargetId(area.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice:
        // desactivar cambia `activo`, que es un filtro.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar área..."
        isLoading={isLoading}
        isError={isInitialError}
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
                  icon={LayersIcon}
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
                  + Nueva Área
                </Button>
              }
            >
              <AreaForm onSuccess={() => setIsDialogOpen(false)} areaToEdit={selectedArea} />
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
          title="Desactivar Área"
          description={`¿Deseas desactivar el área ${deactivateSession.snapshot.nombre}? Su información se conserva y seguirá visible en el listado con estatus Inactivo.`}
          confirmText={isDeactivating ? "Desactivando..." : "Desactivar"}
          closeOnConfirm={false}
          busy={isDeactivating}
          onConfirm={() => {
            const id = deactivateSession.snapshot?.id;
            if (id === undefined) return;
            deactivateArea(id, {
              onSettled: () => setDeactivateTargetId(null),
            });
          }}
          confirmColor="amber"
        />
      )}
    </AreaRowActionsProvider>
  );
}
