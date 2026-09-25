"use client";

import { useMemo, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { getColumns, TrainingRow } from "./TrainingColumns";
import { Training } from "../interfaces/training.interface";
import { ESTADO_CAPACITACION_OPTIONS } from "../constants/trainingChoices";
import TrainingForm from "./TrainingForm";
import { useTrainings } from "../hooks/useTrainings";
import { useDeleteTraining } from "../hooks/useDeleteTraining";
import { TrainingRowActionsProvider } from "../hooks/useTrainingRowActions";

// Filtro en memoria sobre `row.estado` (valor crudo del backend), no sobre la
// etiqueta: las opciones usan los mismos valores del enum.
const FILTER_CONFIG: DataTableFilterConfig[] = [
  { id: "estado", label: "Estado", options: ESTADO_CAPACITACION_OPTIONS },
];

export default function TrainingList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  // El diálogo de borrado vive aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar y se llevaría el diálogo a media confirmación.
  const [trainingToDelete, setTrainingToDelete] = useState<Training | null>(null);
  const { trainings, isLoading, isInitialError, error } = useTrainings();
  const { employees } = useEmployees();
  const { mutate: deleteTraining } = useDeleteTraining();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  const handleEdit = useCallback(
    (training: Training) => {
      setSelectedTraining(training);
      setIsDialogOpen(true);
    },
    [setSelectedTraining, setIsDialogOpen]
  );

  const handleDelete = useCallback(
    (training: Training) => setTrainingToDelete(training),
    [setTrainingToDelete]
  );

  const handleNew = () => {
    setSelectedTraining(null);
    setIsDialogOpen(true);
  };

  // El endpoint devuelve el FK como ID crudo; se resuelve el nombre en cliente.
  // Incluye a los empleados inactivos: una capacitación histórica sigue
  // mostrando a quién pertenece.
  const employeeNameById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, getEmployeeFullName(employee)])),
    [employees]
  );

  // El nombre se incorpora a la FILA, no al accessor: así la llegada tardía del
  // catálogo de empleados produce un `data` nuevo y TanStack recalcula celda,
  // búsqueda y orden. Ver `TrainingRow`.
  const rows = useMemo<TrainingRow[]>(
    () =>
      trainings.map((training) => ({
        ...training,
        empleado_nombre: employeeNameById.get(training.empleado) ?? null,
      })),
    [trainings, employeeNameById]
  );

  // Solo dependen de los permisos: callbacks y "en borrado" llegan al menú por
  // `TrainingRowActionsProvider`, así un borrado en vuelo no remonta las celdas.
  const columns = useMemo(
    () => getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    [canEditHr, canDeleteHr]
  );

  return (
    <TrainingRowActionsProvider value={{ onEdit: handleEdit, onDelete: handleDelete }}>
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // borrar, las filas siguientes cambian de posición.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar capacitación..."
        filterConfig={FILTER_CONFIG}
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

      {canDeleteHr && (
        <ConfirmDialog
          open={trainingToDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setTrainingToDelete(null);
            }
          }}
          title="Eliminar Capacitación"
          description="¿Estás seguro de que deseas eliminar esta capacitación? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={() => {
            if (trainingToDelete) {
              deleteTraining(trainingToDelete.id);
            }
            setTrainingToDelete(null);
          }}
          confirmColor="red"
        />
      )}
    </TrainingRowActionsProvider>
  );
}
