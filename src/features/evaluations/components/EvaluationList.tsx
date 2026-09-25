"use client";

import { useState } from "react";
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
import { getColumns, EvaluationRow } from "./EvaluationColumns";
import { Evaluation } from "../interfaces/evaluation.interface";
import {
  ESTADO_COMPLETADA,
  ESTADO_EVALUACION_OPTIONS,
  PERIODO_EVALUACION_OPTIONS,
  TIPO_EVALUACION_OPTIONS,
} from "../constants/evaluationChoices";
import EvaluationForm from "./EvaluationForm";
import { useEvaluations } from "../hooks/useEvaluations";
import { useDeleteEvaluation } from "../hooks/useDeleteEvaluation";
import { EvaluationRowActionsProvider } from "../hooks/useEvaluationRowActions";

export default function EvaluationList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  // El diálogo de borrado vive aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar. Se guarda el ID y se resuelve contra el listado
  // COMPLETO (ver `evaluationToDelete`).
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const { evaluations, isLoading, isInitialError, error } = useEvaluations();
  const { employees } = useEmployees();
  const { mutate: deleteEvaluation } = useDeleteEvaluation();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente (ver
  // CLAUDE.md y `IncidentList`).
  const handleEdit = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsDialogOpen(true);
  };

  const handleDelete = (evaluation: Evaluation) => setDeleteTargetId(evaluation.id);

  const handleNew = () => {
    setSelectedEvaluation(null);
    setIsDialogOpen(true);
  };

  // Los dos FK apuntan al MISMO catálogo de empleados, que incluye a los
  // inactivos: una evaluación histórica sigue mostrando a quién pertenece y
  // quién la hizo.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  const employeeName = (id: number) => employeeNameById.get(id) ?? `Empleado #${id}`;

  // Los nombres se incorporan a la FILA, no al accessor: así la llegada tardía
  // del catálogo produce un `data` nuevo y TanStack recalcula celda, búsqueda y
  // orden. Ver `EvaluationRow`.
  const rows: EvaluationRow[] = evaluations.map((evaluation) => ({
    ...evaluation,
    empleado_nombre: employeeName(evaluation.empleado),
    evaluador_nombre:
      evaluation.evaluador === null ? "Sin evaluador" : employeeName(evaluation.evaluador),
  }));

  // Filtros en memoria sobre el valor CRUDO de la fila (`row.estado`,
  // `row.empleado`, ...). Las opciones de empleado salen del catálogo COMPLETO
  // (activos e inactivos), no de las filas visibles: si salieran de las filas,
  // borrar la última evaluación de un empleado dejaría su filtro activo sin
  // opción (el chip mostraría el id crudo) y, sin filas, sin config (el chip
  // desaparecería con el filtro aún aplicado). La config existe siempre.
  const empleadoFilterOptions = employees
    .map((employee) => ({
      value: String(employee.id),
      label: employee.activo
        ? getEmployeeFullName(employee)
        : `${getEmployeeFullName(employee)} (inactivo)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const filterConfig: DataTableFilterConfig[] = [
    { id: "estado", label: "Estado", options: ESTADO_EVALUACION_OPTIONS },
    { id: "tipo", label: "Tipo", options: TIPO_EVALUACION_OPTIONS },
    { id: "periodo", label: "Periodo", options: PERIODO_EVALUACION_OPTIONS },
    { id: "empleado", label: "Empleado", options: empleadoFilterOptions },
  ];

  // Solo dependen de los permisos: callbacks y "en borrado" llegan al menú por
  // `EvaluationRowActionsProvider`, así un borrado no remonta las celdas.
  const columns = getColumns({ canEdit: canEditHr, canDelete: canDeleteHr });

  // La confirmación se resuelve contra el arreglo COMPLETO, así muestra el
  // estado vigente tras un refetch. Mismo criterio que `IncidentList`.
  const evaluationToDelete =
    deleteTargetId !== null
      ? (evaluations.find((evaluation) => evaluation.id === deleteTargetId) ?? null)
      : null;

  // Si la evaluación desaparece del payload, el id no puede quedar colgado (un
  // refetch posterior reabriría el diálogo solo). Ajuste en RENDER, no en un
  // efecto (`react-hooks/set-state-in-effect`).
  if (deleteTargetId !== null && evaluationToDelete === null) setDeleteTargetId(null);

  return (
    <EvaluationRowActionsProvider value={{ onEdit: handleEdit, onDelete: handleDelete }}>
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // borrar, las filas siguientes cambian de posición.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar evaluación..."
        filterConfig={filterConfig}
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar evaluaciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando evaluaciones"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedEvaluation ? "Editar Evaluación" : "Alta de Evaluación"}
                  subtitle={selectedEvaluation ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="violet"
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
                  + Nueva Evaluación
                </Button>
              }
            >
              <EvaluationForm
                onSuccess={() => setIsDialogOpen(false)}
                evaluationToEdit={selectedEvaluation}
              />
            </MainDialog>
          ) : null
        }
      />

      {/*
        Solo sobre pendientes: si la evaluación se completó mientras el diálogo
        estaba abierto (refetch), la confirmación deja de ofrecerse.
      */}
      {canDeleteHr && evaluationToDelete && evaluationToDelete.estado !== ESTADO_COMPLETADA && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleteTargetId(null);
            }
          }}
          title="Eliminar Evaluación"
          description="¿Estás seguro de que deseas eliminar esta evaluación? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          onConfirm={() => {
            deleteEvaluation(evaluationToDelete.id);
            setDeleteTargetId(null);
          }}
          confirmColor="red"
        />
      )}
    </EvaluationRowActionsProvider>
  );
}
