"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
import { MainDialog } from "@/src/components/MainDialog";
import { ConfirmDialog } from "@/src/components/ConfirmDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { AbsenceIcon } from "@/src/components/Icons";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import type { StaleRowDialogNotice } from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { ABSENCE_HEADER_FILTERS, formatAbsenceRange, getColumns } from "./AbsenceColumns";
import { Absence } from "../interfaces/absence.interface";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  ESTADO_RECHAZADO,
  getAusenciaVocabulary,
  getTipoAusenciaLabel,
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
import { verifyAbsenceEstado } from "../hooks/verifyAbsenceEstado";
import { buildAbsenceRows, getAbsenceStaleNotice } from "../utils/absenceRows";

/**
 * Permiso de aprobar/confirmar y rechazar/descartar: `D-RH`, igual que en
 * vacaciones (no hay código de aprobación propio de RH en el catálogo).
 */
const APPROVE_PERMISSION = "D-RH";

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
  // Aviso del diálogo de fila que se cerró porque su registro cambió por
  // fuera, mostrado desde un efecto.
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
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

  const rows = buildAbsenceRows(absences, employeeNameById, usersById, isUsersError);

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `AbsenceRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({ canEdit: canEditHr, canApprove: canApproveHr, canDelete: canDeleteHr }),
    rows,
    ABSENCE_HEADER_FILTERS
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const approveTarget = findRow(approveTargetId);
  const rejectTarget = findRow(rejectTargetId);
  const deleteTarget = findRow(deleteRequest?.id ?? null);

  const isApproveBusy =
    approveTargetId !== null && (isApproving || busyIds.includes(approveTargetId));
  const isRejectBusy = rejectTargetId !== null && busyIds.includes(rejectTargetId);

  // Ajustes en RENDER (no en efecto). Un detalle cuyo registro desapareció se
  // cierra sin aviso.
  if (detailTargetId !== null && detailTarget === null) setDetailTargetId(null);

  // Vía rápida contra la caché, con el mismo aviso que la guarda de red:
  // resolver espera un pendiente; el borrado, el estado de apertura. Ninguno
  // se toca mientras su propia acción está en vuelo. Mismo criterio que
  // vacaciones.
  const staleApprove = getAbsenceStaleNotice(
    approveTargetId,
    approveTarget,
    ESTADO_PENDIENTE,
    isApproveBusy
  );
  if (staleApprove) {
    setApproveTargetId(null);
    setStaleNotice(staleApprove);
  }
  const staleReject = getAbsenceStaleNotice(rejectTargetId, rejectTarget, ESTADO_PENDIENTE, isRejectBusy);
  if (staleReject) {
    setRejectTargetId(null);
    setStaleNotice(staleReject);
  }
  const staleDelete = getAbsenceStaleNotice(
    deleteRequest?.id ?? null,
    deleteTarget,
    deleteRequest?.estado ?? ESTADO_PENDIENTE,
    isCheckingDelete
  );
  if (staleDelete) {
    setDeleteRequest(null);
    setStaleNotice(staleDelete);
  }

  useEffect(() => {
    if (staleNotice) {
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // Copias al ABRIR cada diálogo: el texto no sigue a los refetch y sobrevive
  // a la animación de salida cuando el id vuelve a `null`.
  const detailSession = useDialogSession(detailTargetId !== null, detailTarget);
  const approveSession = useDialogSession(approveTargetId !== null, approveTarget);
  const rejectSession = useDialogSession(rejectTargetId !== null, rejectTarget);
  const deleteSession = useDialogSession(deleteRequest !== null, deleteTarget);

  // La confirmación FUERTE depende del estado de APERTURA, no del de la caché.
  const isApprovedDelete = deleteSession.snapshot?.estado === ESTADO_APROBADO;

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

  const approveSnapshot = approveSession.snapshot;
  const approveVocabulary = approveSnapshot ? getAusenciaVocabulary(approveSnapshot.tipo) : null;
  const deleteSnapshot = deleteSession.snapshot;
  const deleteTipoLabel = deleteSnapshot
    ? (getTipoAusenciaLabel(deleteSnapshot.tipo) ?? "registro").toLowerCase()
    : "";
  const deleteEstadoLabel = deleteSnapshot
    ? getAusenciaVocabulary(deleteSnapshot.tipo).estadoLabel.aprobado.toLowerCase()
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
                  icon={AbsenceIcon}
                />
              }
              open={isFormOpen}
              onOpenChange={setIsFormOpen}
              maxWidth={DIALOG_WIDTH_FORM}
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

      {/*
        Montados mientras haya una copia: `open` sale del id, así que al
        cerrarse animan su salida con los datos de la apertura.
      */}
      {detailSession.snapshot && (
        <AbsenceDetailDialog
          key={`detail-${detailSession.id}`}
          // El detalle sí sigue a los refetch mientras su registro exista.
          absence={detailTarget ?? detailSession.snapshot}
          open={detailTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {/* Sin optimista: queda abierto y bloqueado hasta que responde el servidor. */}
      {canApproveHr && approveSnapshot && approveVocabulary && (
        <ConfirmDialog
          key={`approve-${approveSession.id}`}
          open={approveTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setApproveTargetId(null);
          }}
          title={
            approveSnapshot.tipo === TIPO_FALTA_INJUSTIFICADA
              ? "Confirmar Falta Injustificada"
              : `Aprobar ${getTipoAusenciaLabel(approveSnapshot.tipo) ?? "Registro"}`
          }
          description={
            approveSnapshot.tipo === TIPO_FALTA_INJUSTIFICADA
              ? `¿Confirmar la falta injustificada de ${approveSnapshot.empleado_nombre} (${formatAbsenceRange(
                  approveSnapshot
                )})? Quedará registrado quién la confirmó y cuándo.`
              : `¿Aprobar el registro de ${(
                  getTipoAusenciaLabel(approveSnapshot.tipo) ?? ""
                ).toLowerCase()} de ${approveSnapshot.empleado_nombre} (${formatAbsenceRange(
                  approveSnapshot
                )})? Quedará registrado quién lo aprobó y cuándo.`
          }
          confirmText={isApproveBusy ? "Procesando…" : approveVocabulary.approveAction}
          confirmColor="green"
          closeOnConfirm={false}
          busy={isApproveBusy}
          onConfirm={() =>
            approveAbsence(
              { id: approveSnapshot.id, tipo: approveSnapshot.tipo },
              { onSettled: () => setApproveTargetId(null) }
            )
          }
        />
      )}

      {/* Mientras su rechazo está en vuelo la vía rápida no lo toca (ver vacaciones). */}
      {canApproveHr && rejectSession.snapshot && (
        <AbsenceRejectDialog
          key={`reject-${rejectSession.id}`}
          absence={rejectSession.snapshot}
          open={rejectTargetId !== null}
          onClose={() => setRejectTargetId(null)}
        />
      )}

      {/*
        Pendiente: confirmación normal. Aprobado: confirmación FUERTE (es la
        única forma de anularlo y borra su registro de aprobación). Un
        rechazado nunca llega aquí.
      */}
      {canDeleteHr && deleteSnapshot && deleteSnapshot.estado !== ESTADO_RECHAZADO && (
        <ConfirmDialog
          key={`delete-${deleteSession.id}`}
          open={deleteRequest !== null}
          onOpenChange={(open) => {
            if (!open && !isCheckingDelete) setDeleteRequest(null);
          }}
          closeOnConfirm={false}
          busy={isCheckingDelete}
          maxWidth={isApprovedDelete ? "520px" : undefined}
          title={isApprovedDelete ? "Anular Registro Resuelto" : "Eliminar Registro de Ausencia"}
          description={
            isApprovedDelete
              ? `Vas a ELIMINAR DEFINITIVAMENTE el registro de ${deleteTipoLabel} (${deleteEstadoLabel}) de ${deleteSnapshot.empleado_nombre} (${formatAbsenceRange(
                  deleteSnapshot
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
