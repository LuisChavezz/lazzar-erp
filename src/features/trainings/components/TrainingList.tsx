"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { TrainingIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { getColumns, TRAINING_HEADER_FILTERS } from "./TrainingColumns";
import { Training } from "../interfaces/training.interface";
import TrainingForm from "./TrainingForm";
import { useTrainings } from "../hooks/useTrainings";
import { useDeleteTraining } from "../hooks/useDeleteTraining";
import { TrainingRowActionsProvider, usePendingTrainingIds } from "../hooks/useTrainingRowActions";
import { buildTrainingRows, TRAINING_STALE_MESSAGES } from "../utils/trainingRows";

export default function TrainingList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado COMPLETO — la
  // celda se desmonta al ordenar/paginar/filtrar y se llevaría el diálogo a
  // media confirmación.
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const { trainings, isLoading, isInitialError, error } = useTrainings();
  const { employees } = useEmployees();
  const { mutate: deleteTraining, isPending: isDeletePending } = useDeleteTraining();
  const busyIds = usePendingTrainingIds();
  // Aviso del diálogo de fila que se cerró porque su capacitación desapareció.
  // Se dispara desde un efecto: un toast en pleno render actualizaría otro
  // componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente.
  const handleEdit = (training: Training) => {
    setSelectedTraining(training);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setSelectedTraining(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  // Incluye a los empleados inactivos: una capacitación histórica sigue
  // mostrando a quién pertenece.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de empleados produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda, orden y opciones de filtro. Ver `TrainingRow`.
  const rows = buildTrainingRows(trainings, employeeNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `TrainingRowActionsProvider`, así un borrado no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    TRAINING_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deleteTarget =
    deleteTargetId !== null ? (rows.find((row) => row.id === deleteTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo. El optimista
  // saca la fila del listado al confirmar: sin esto se leería como "ya no
  // existe".
  const isDeleting =
    deleteTargetId !== null && (busyIds.includes(deleteTargetId) || isDeletePending);

  // Vía rápida contra la caché: un refetch mostró que la capacitación del
  // diálogo abierto ya no existe (otra persona la borró). Sin baja lógica,
  // solo cuenta que desaparezca. Ajuste en render, no en un efecto.
  const staleDelete = getStaleRowDialogNotice({
    resource: "training",
    targetId: deleteTargetId,
    target: deleteTarget,
    isBusy: isDeleting,
    messages: TRAINING_STALE_MESSAGES,
  });
  if (staleDelete) {
    setDeleteTargetId(null);
    setStaleNotice(staleDelete);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copia de la capacitación al ABRIR la confirmación: el texto no sigue a los
  // refetch y sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deleteSession = useDialogSession(deleteTargetId !== null, deleteTarget);

  return (
    <TrainingRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDelete: (training) => setDeleteTargetId(training.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // borrar, las filas siguientes cambian de posición.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar capacitación..."
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar capacitaciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando capacitaciones"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedTraining ? "Editar Capacitación" : "Alta de Capacitación"}
                  subtitle={selectedTraining ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="emerald"
                  icon={TrainingIcon}
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
                  + Nueva Capacitación
                </Button>
              }
            >
              <TrainingForm
                onSuccess={() => setIsDialogOpen(false)}
                trainingToEdit={selectedTraining}
              />
            </MainDialog>
          ) : null
        }
      />

      {/*
        Montado mientras haya una copia: `open` sale del id, así que al
        cerrarse anima su salida con el nombre de la apertura. Queda abierto y
        bloqueado (`busy`) hasta que el servidor responde y el listado se
        refresca; entonces lo cierra su `onSettled`.
      */}
      {canDeleteHr && deleteSession.snapshot && (
        <ConfirmDialog
          key={`delete-${deleteSession.id}`}
          open={deleteTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTargetId(null);
          }}
          title="Eliminar Capacitación"
          description={`¿Estás seguro de que deseas eliminar la capacitación «${deleteSession.snapshot.nombre}» de ${deleteSession.snapshot.empleado_nombre}? Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() => {
            const id = deleteSession.snapshot?.id;
            if (id === undefined) return;
            deleteTraining(id, {
              onSettled: () => setDeleteTargetId(null),
            });
          }}
          confirmColor="red"
        />
      )}
    </TrainingRowActionsProvider>
  );
}
