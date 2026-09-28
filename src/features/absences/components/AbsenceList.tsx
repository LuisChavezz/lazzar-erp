"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
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
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { resolveUserName } from "@/src/features/users/utils/resolveUserName";
import { AbsenceRow, formatAbsenceRange, getColumns } from "./AbsenceColumns";
import { Absence } from "../interfaces/absence.interface";
import {
  ESTADO_APROBADO,
  ESTADO_AUSENCIA_FILTER_OPTIONS,
  ESTADO_PENDIENTE,
  ESTADO_RECHAZADO,
  getAusenciaVocabulary,
  getTipoAusenciaLabel,
  TIPO_AUSENCIA_OPTIONS,
  TIPO_FALTA_INJUSTIFICADA,
  type EstadoAusencia,
} from "../constants/absenceChoices";
import AbsenceForm from "./AbsenceForm";
import { AbsenceDetailDialog } from "./AbsenceDetailDialog";
import { AbsenceRejectDialog } from "./AbsenceRejectDialog";
import { useAbsences } from "../hooks/useAbsences";
import { useDeleteAbsence } from "../hooks/useDeleteAbsence";
import { useApproveAbsence } from "../hooks/useApproveAbsence";
import { AbsenceRowActionsProvider, usePendingAbsenceIds } from "../hooks/useAbsenceRowActions";
import { ABSENCE_GONE_MESSAGE, absenceEstadoChangedMessage } from "../hooks/absenceErrorMessages";
import { verifyAbsenceEstado } from "../hooks/verifyAbsenceEstado";

/**
 * Permiso de aprobar/confirmar y rechazar/descartar: `D-RH`, igual que en
 * vacaciones (no hay código de aprobación propio de RH en el catálogo).
 */
const APPROVE_PERMISSION = "D-RH";

// `con_goce_sueldo` se compara como `String(boolean)` (DataTable filtra por el
// valor CRUDO de la fila).
const GOCE_FILTER_OPTIONS = [
  { value: "true", label: "Con goce" },
  { value: "false", label: "Sin goce" },
];

const FILTER_CONFIG: DataTableFilterConfig[] = [
  { id: "tipo", label: "Tipo", options: TIPO_AUSENCIA_OPTIONS },
  { id: "estado", label: "Estado", options: ESTADO_AUSENCIA_FILTER_OPTIONS },
  { id: "con_goce_sueldo", label: "Goce de sueldo", options: GOCE_FILTER_OPTIONS },
];

export default function AbsenceList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);
  // Los diálogos de fila viven aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar, y resolver un registro cambia `estado` —un filtro—.
  // Se guarda el ID y se resuelve contra el listado COMPLETO.
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  // El borrado guarda también el ESTADO con que se abrió la confirmación (la
  // guarda previa al DELETE compara contra él).
  const [deleteRequest, setDeleteRequest] = useState<{ id: number; estado: EstadoAusencia } | null>(
    null
  );
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const checkingDeleteRef = useRef(false);
  const queryClient = useQueryClient();
  // Aviso pendiente de la vía rápida (ver `closeStale`), mostrado desde un efecto.
  const [staleNotice, setStaleNotice] = useState<{ key: string; message: string } | null>(null);
  // Acciones de fila en vuelo: UNA suscripción para toda la tabla.
  const busyIds = usePendingAbsenceIds();

  const { absences, isLoading, isInitialError, error } = useAbsences();
  const { employees } = useEmployees();
  const { data: users, isError: isUsersError } = useUsers();
  const { mutate: deleteAbsence } = useDeleteAbsence();
  const { mutate: approveAbsence, isPending: isApproving } = useApproveAbsence();
  const { data: session } = useSession();
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);
  const canApproveHr = hasPermission(APPROVE_PERMISSION, session?.user);

  const handleEdit = (absence: Absence) => {
    setSelectedAbsence(absence);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedAbsence(null);
    setIsFormOpen(true);
  };

  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  const usersById = users ? new Map(users.map((user) => [user.id, user])) : null;

  const rows: AbsenceRow[] = absences.map((absence) => ({
    ...absence,
    empleado_nombre: employeeNameById.get(absence.empleado) ?? `Empleado #${absence.empleado}`,
    solicitado_por_nombre: resolveUserName(absence.solicitado_por, usersById, isUsersError),
    autorizado_por_nombre: resolveUserName(absence.autorizado_por, usersById, isUsersError),
    rechazado_por_nombre: resolveUserName(absence.rechazado_por, usersById, isUsersError),
  }));

  const columns = getColumns({ canEdit: canEditHr, canApprove: canApproveHr, canDelete: canDeleteHr });

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const approveTarget = findRow(approveTargetId);
  const rejectTarget = findRow(rejectTargetId);
  const deleteTarget = findRow(deleteRequest?.id ?? null);

  /** Vía rápida contra la caché: mismo aviso que la guarda de red. */
  const closeStale = (id: number, target: AbsenceRow | null) =>
    setStaleNotice({
      key: `absence-stale-${id}-${target?.estado ?? "gone"}`,
      message: target ? absenceEstadoChangedMessage(target.tipo, target.estado) : ABSENCE_GONE_MESSAGE,
    });

  // Ajustes en RENDER (no en efecto). Aprobar, rechazar y borrar no se tocan
  // mientras su propia acción está en vuelo. Mismo criterio que vacaciones.
  if (detailTargetId !== null && detailTarget === null) setDetailTargetId(null);
  if (
    approveTargetId !== null &&
    approveTarget?.estado !== ESTADO_PENDIENTE &&
    !isApproving &&
    !busyIds.includes(approveTargetId)
  ) {
    setApproveTargetId(null);
    closeStale(approveTargetId, approveTarget);
  }
  if (
    rejectTargetId !== null &&
    rejectTarget?.estado !== ESTADO_PENDIENTE &&
    !busyIds.includes(rejectTargetId)
  ) {
    setRejectTargetId(null);
    closeStale(rejectTargetId, rejectTarget);
  }
  if (
    deleteRequest !== null &&
    !isCheckingDelete &&
    (deleteTarget === null || deleteTarget.estado !== deleteRequest.estado)
  ) {
    setDeleteRequest(null);
    closeStale(deleteRequest.id, deleteTarget);
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // La confirmación FUERTE depende del estado de APERTURA, no del de la caché.
  const isApprovedDelete = deleteRequest?.estado === ESTADO_APROBADO;

  /**
   * Borrado (pendiente) o anulación (aprobado) con guarda previa: se lee el
   * registro FRESCO y solo se envía el DELETE si sigue en el estado de
   * apertura. `stale` cierra; `error` deja la confirmación abierta.
   */
  const handleConfirmDelete = async () => {
    if (!deleteRequest || checkingDeleteRef.current) return;
    checkingDeleteRef.current = true;
    setIsCheckingDelete(true);
    try {
      const check = await verifyAbsenceEstado(queryClient, deleteRequest.id, deleteRequest.estado);
      if (check === "ok") {
        deleteAbsence(deleteRequest.id);
      }
      if (check !== "error") {
        setDeleteRequest(null);
      }
    } finally {
      checkingDeleteRef.current = false;
      setIsCheckingDelete(false);
    }
  };

  const approveVocabulary = approveTarget ? getAusenciaVocabulary(approveTarget.tipo) : null;
  const deleteTipoLabel = deleteTarget
    ? (getTipoAusenciaLabel(deleteTarget.tipo) ?? "registro").toLowerCase()
    : "";
  const deleteEstadoLabel = deleteTarget
    ? getAusenciaVocabulary(deleteTarget.tipo).estadoLabel.aprobado.toLowerCase()
    : "";

  return (
    <AbsenceRowActionsProvider
      value={{
        onView: (absence) => setDetailTargetId(absence.id),
        onEdit: handleEdit,
        onApprove: (absence) => setApproveTargetId(absence.id),
        onReject: (absence) => setRejectTargetId(absence.id),
        onDelete: (absence) => setDeleteRequest({ id: absence.id, estado: absence.estado }),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar permiso o ausencia..."
        filterConfig={FILTER_CONFIG}
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar permisos y ausencias"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando permisos y ausencias"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedAbsence ? "Editar Permiso o Ausencia" : "Alta de Permiso o Ausencia"}
                  subtitle={selectedAbsence ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="amber"
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth="1000px"
              trigger={
                <Button
                  variant="primary"
                  rounded="full"
                  onClick={handleNew}
                  className="hover:scale-105 active:scale-95"
                >
                  + Nuevo Registro
                </Button>
              }
            >
              <AbsenceForm onSuccess={() => setIsFormOpen(false)} absenceToEdit={selectedAbsence} />
            </MainDialog>
          ) : null
        }
      />

      {detailTarget && (
        <AbsenceDetailDialog
          absence={detailTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {/* Sin optimista: queda abierto y bloqueado hasta que responde el servidor. */}
      {canApproveHr &&
        approveTarget &&
        approveVocabulary &&
        (approveTarget.estado === ESTADO_PENDIENTE || isApproving) && (
          <ConfirmDialog
            open
            onOpenChange={(open) => {
              if (!open) setApproveTargetId(null);
            }}
            title={
              approveTarget.tipo === TIPO_FALTA_INJUSTIFICADA
                ? "Confirmar Falta Injustificada"
                : `Aprobar ${getTipoAusenciaLabel(approveTarget.tipo) ?? "Registro"}`
            }
            description={
              approveTarget.tipo === TIPO_FALTA_INJUSTIFICADA
                ? `¿Confirmar la falta injustificada de ${approveTarget.empleado_nombre} (${formatAbsenceRange(
                    approveTarget
                  )})? Quedará registrado quién la confirmó y cuándo.`
                : `¿Aprobar el registro de ${(
                    getTipoAusenciaLabel(approveTarget.tipo) ?? ""
                  ).toLowerCase()} de ${approveTarget.empleado_nombre} (${formatAbsenceRange(
                    approveTarget
                  )})? Quedará registrado quién lo aprobó y cuándo.`
            }
            confirmText={isApproving ? "Procesando…" : approveVocabulary.approveAction}
            confirmColor="green"
            closeOnConfirm={false}
            busy={isApproving}
            onConfirm={() =>
              approveAbsence(
                { id: approveTarget.id, tipo: approveTarget.tipo },
                { onSettled: () => setApproveTargetId(null) }
              )
            }
          />
        )}

      {/* Sigue montado mientras su rechazo está en vuelo (ver vacaciones). */}
      {canApproveHr &&
        rejectTarget &&
        (rejectTarget.estado === ESTADO_PENDIENTE || busyIds.includes(rejectTarget.id)) && (
          <AbsenceRejectDialog
            key={rejectTarget.id}
            absence={rejectTarget}
            onClose={() => setRejectTargetId(null)}
          />
        )}

      {/*
        Pendiente: confirmación normal. Aprobado: confirmación FUERTE (es la
        única forma de anularlo y borra su registro de aprobación). Un
        rechazado nunca llega aquí.
      */}
      {canDeleteHr && deleteRequest && deleteTarget && deleteRequest.estado !== ESTADO_RECHAZADO && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open && !isCheckingDelete) setDeleteRequest(null);
          }}
          closeOnConfirm={false}
          busy={isCheckingDelete}
          maxWidth={isApprovedDelete ? "520px" : undefined}
          title={isApprovedDelete ? "Anular Registro Resuelto" : "Eliminar Registro de Ausencia"}
          description={
            isApprovedDelete
              ? `Vas a ELIMINAR DEFINITIVAMENTE el registro de ${deleteTipoLabel} (${deleteEstadoLabel}) de ${deleteTarget.empleado_nombre} (${formatAbsenceRange(
                  deleteTarget
                )}). Es la única forma de anularlo: el registro y su trazabilidad (quién lo resolvió y cuándo) se borran y no se pueden recuperar. Esta acción es irreversible.`
              : "¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
          }
          confirmText={
            isCheckingDelete ? "Verificando…" : isApprovedDelete ? "Sí, eliminar definitivamente" : "Eliminar"
          }
          onConfirm={() => void handleConfirmDelete()}
          confirmColor="red"
        />
      )}
    </AbsenceRowActionsProvider>
  );
}
