"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { EvaluationIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { getStaleRowDialogNotice, type StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { getColumns, EVALUATION_HEADER_FILTERS } from "./EvaluationColumns";
import { Evaluation } from "../interfaces/evaluation.interface";
import { ESTADO_PENDIENTE } from "../constants/evaluationChoices";
import EvaluationForm from "./EvaluationForm";
import { useEvaluations } from "../hooks/useEvaluations";
import { useDeleteEvaluation } from "../hooks/useDeleteEvaluation";
import {
  EvaluationRowActionsProvider,
  usePendingEvaluationIds,
} from "../hooks/useEvaluationRowActions";
import { buildEvaluationRows, EVALUATION_STALE_MESSAGES } from "../utils/evaluationRows";

export default function EvaluationList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
  // Diálogo de fila: solo el id, resuelto contra el listado COMPLETO — la
  // celda se desmonta al ordenar/paginar/filtrar, y completar una evaluación
  // cambia `estado`, que es un filtro.
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const { evaluations, isLoading, isInitialError, error } = useEvaluations();
  const { employees } = useEmployees();
  const { mutate: deleteEvaluation, isPending: isDeletePending } = useDeleteEvaluation();
  // Borrados en vuelo: UNA suscripción para toda la tabla, que llega a los
  // menús por contexto y a la guarda de abajo.
  const busyIds = usePendingEvaluationIds();
  // Aviso del diálogo de fila que se cerró porque su evaluación cambió por
  // fuera. Se dispara desde un efecto: un toast en pleno render actualizaría
  // otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente.
  const handleEdit = (evaluation: Evaluation) => {
    setSelectedEvaluation(evaluation);
    setIsDialogOpen(true);
  };

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

  // Los nombres se incorporan a la FILA, no al accessor: así la llegada tardía
  // del catálogo produce un `data` nuevo y TanStack recalcula celda, búsqueda,
  // orden y opciones de filtro. Ver `EvaluationRow`.
  const rows = buildEvaluationRows(evaluations, employeeNameById);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `EvaluationRowActionsProvider`, así un borrado no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canDelete: canDeleteHr }),
    rows,
    EVALUATION_HEADER_FILTERS
  );

  // ── Diálogo de fila, resuelto contra el listado COMPLETO ──────────────────
  const deleteTarget =
    deleteTargetId !== null ? (rows.find((row) => row.id === deleteTargetId) ?? null) : null;
  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo (el optimista
  // saca la fila del listado al confirmar).
  const isDeleting =
    deleteTargetId !== null && (busyIds.includes(deleteTargetId) || isDeletePending);

  // Vía rápida contra la caché: un refetch mostró que la evaluación del
  // diálogo abierto ya no existe o ya no está pendiente (una completada no se
  // elimina). Se cierra con un aviso. Ajuste en render, no en un efecto.
  const staleDelete = getStaleRowDialogNotice({
    resource: "evaluation",
    targetId: deleteTargetId,
    target: deleteTarget,
    expectedEstado: ESTADO_PENDIENTE,
    isBusy: isDeleting,
    messages: EVALUATION_STALE_MESSAGES,
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

  // Copia de la evaluación al ABRIR la confirmación: el texto no sigue a los
  // refetch y sobrevive a la animación de salida cuando el id vuelve a `null`.
  const deleteSession = useDialogSession(deleteTargetId !== null, deleteTarget);

  return (
    <EvaluationRowActionsProvider
      value={{
        onEdit: handleEdit,
        onDelete: (evaluation) => setDeleteTargetId(evaluation.id),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice: al
        // borrar, las filas siguientes cambian de posición.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar evaluación..."
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
                  icon={EvaluationIcon}
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
          title="Eliminar Evaluación"
          description={`¿Estás seguro de que deseas eliminar la evaluación de ${deleteSession.snapshot.empleado_nombre}? Esta acción no se puede deshacer.`}
          confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
          closeOnConfirm={false}
          busy={isDeleting}
          onConfirm={() => {
            const id = deleteSession.snapshot?.id;
            if (id === undefined) return;
            deleteEvaluation(id, {
              onSettled: () => setDeleteTargetId(null),
            });
          }}
          confirmColor="red"
        />
      )}
    </EvaluationRowActionsProvider>
  );
}
