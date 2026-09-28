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
import { formatVacationRange, getColumns, VacationRow } from "./VacationColumns";
import { Vacation } from "../interfaces/vacation.interface";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  ESTADO_RECHAZADO,
  ESTADO_VACACION_OPTIONS,
  type EstadoVacacion,
} from "../constants/vacationChoices";
import VacationForm from "./VacationForm";
import { VacationDetailDialog } from "./VacationDetailDialog";
import { VacationRejectDialog } from "./VacationRejectDialog";
import { useVacations } from "../hooks/useVacations";
import { useDeleteVacation } from "../hooks/useDeleteVacation";
import { useApproveVacation } from "../hooks/useApproveVacation";
import {
  usePendingVacationIds,
  VacationRowActionsProvider,
} from "../hooks/useVacationRowActions";
import {
  VACATION_GONE_MESSAGE,
  vacationEstadoChangedMessage,
} from "../hooks/vacationErrorMessages";
import { verifyVacationEstado } from "../hooks/verifyVacationEstado";
import { diasLabel } from "../utils/diasLabel";

/**
 * Permiso de aprobar y rechazar (D2). El catálogo de permisos no tiene un
 * código de aprobación para RH (sí `A-COMPRAS-OC` y `A-MESACONTROL-COTI`), así
 * que se usa `D-RH`. Si se crea uno (p. ej. `A-RH`), se cambia SOLO aquí.
 */
const APPROVE_PERMISSION = "D-RH";

export default function VacationList() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null);
  // Los diálogos de fila viven aquí y no en la celda: la celda se desmonta al
  // ordenar/paginar/filtrar, y aprobar o rechazar cambia `estado` —un filtro—.
  // Se guarda el ID y se resuelve contra el listado COMPLETO.
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null);
  const [approveTargetId, setApproveTargetId] = useState<number | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  // El borrado guarda también el ESTADO con que se abrió la confirmación: la
  // guarda previa al DELETE compara contra él (una pendiente se borra con la
  // confirmación simple; una aprobada, solo con la fuerte).
  const [deleteRequest, setDeleteRequest] = useState<{ id: number; estado: EstadoVacacion } | null>(
    null
  );
  // Verificación previa al DELETE en curso (ver `handleConfirmDelete`).
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  // Guarda SÍNCRONA contra el doble clic en el mismo tick: `busy` llega hasta
  // el siguiente render.
  const checkingDeleteRef = useRef(false);
  const queryClient = useQueryClient();
  // Aviso pendiente de la vía rápida (ver `closeStale`). Se muestra desde un
  // efecto: un toast en pleno render actualizaría otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<{ key: string; message: string } | null>(null);
  // Acciones de fila en vuelo: UNA suscripción para toda la tabla; llega a los
  // menús por contexto y a las guardas de abajo.
  const busyIds = usePendingVacationIds();

  const { vacations, isLoading, isInitialError, error } = useVacations();
  const { employees } = useEmployees();
  // Solo para resolver la trazabilidad. No bloquea la tabla: mientras carga
  // dice "…" y si falla cae a "Usuario #N" (ver `resolveUserName`).
  const { data: users, isError: isUsersError } = useUsers();
  const { mutate: deleteVacation } = useDeleteVacation();
  const { mutate: approveVacation, isPending: isApproving } = useApproveVacation();
  const { data: session } = useSession();
  // `hasPermission` ya cortocircuita para el rol "admin".
  const canEditHr = hasPermission("E-RH", session?.user);
  const canDeleteHr = hasPermission("D-RH", session?.user);
  const canApproveHr = hasPermission(APPROVE_PERMISSION, session?.user);

  // Sin `useCallback`/`useMemo`: el React Compiler memoiza el componente.
  const handleEdit = (vacation: Vacation) => {
    setSelectedVacation(vacation);
    setIsFormOpen(true);
  };

  const handleNew = () => {
    setSelectedVacation(null);
    setIsFormOpen(true);
  };

  // Incluye a los empleados inactivos: una solicitud histórica sigue diciendo
  // de quién es.
  const employeeNameById = new Map(
    employees.map((employee) => [employee.id, getEmployeeFullName(employee)])
  );
  // `null` mientras el catálogo de usuarios no tenga datos (cargando o caído).
  const usersById = users ? new Map(users.map((user) => [user.id, user])) : null;

  // Los nombres se incorporan a la FILA, no al accessor: así la llegada tardía
  // de un catálogo produce un `data` nuevo y TanStack recalcula todo.
  const rows: VacationRow[] = vacations.map((vacation) => ({
    ...vacation,
    empleado_nombre:
      employeeNameById.get(vacation.empleado) ?? `Empleado #${vacation.empleado}`,
    solicitado_por_nombre: resolveUserName(vacation.solicitado_por, usersById, isUsersError),
    autorizado_por_nombre: resolveUserName(vacation.autorizado_por, usersById, isUsersError),
    rechazado_por_nombre: resolveUserName(vacation.rechazado_por, usersById, isUsersError),
  }));

  // Filtros en memoria sobre el valor CRUDO de la fila (`row.estado`,
  // `row.empleado`). Las opciones de empleado salen del catálogo COMPLETO y la
  // config existe siempre: si salieran de las filas, borrar la última solicitud
  // de un empleado dejaría su filtro activo sin opción. Mismo criterio que
  // evaluaciones.
  const empleadoFilterOptions = employees
    .map((employee) => ({
      value: String(employee.id),
      label: employee.activo
        ? getEmployeeFullName(employee)
        : `${getEmployeeFullName(employee)} (inactivo)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const filterConfig: DataTableFilterConfig[] = [
    { id: "estado", label: "Estado", options: ESTADO_VACACION_OPTIONS },
    { id: "empleado", label: "Empleado", options: empleadoFilterOptions },
  ];

  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `VacationRowActionsProvider`, así una acción no remonta las celdas.
  const columns = getColumns({
    canEdit: canEditHr,
    canApprove: canApproveHr,
    canDelete: canDeleteHr,
  });

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  // Aprobar y rechazar solo tienen sentido sobre una pendiente: si cambió de
  // estado mientras el diálogo estaba abierto (refetch, otra pestaña), el
  // diálogo deja de ofrecerse.
  const approveTarget = findRow(approveTargetId);
  const rejectTarget = findRow(rejectTargetId);
  const deleteTarget = findRow(deleteRequest?.id ?? null);

  /**
   * Vía rápida contra la caché: un refetch mostró que la solicitud de un
   * diálogo abierto cambió de estado o ya no existe. Se deja el mismo aviso que
   * da la guarda de red, para que el diálogo no desaparezca sin explicación.
   */
  const closeStale = (id: number, target: VacationRow | null) =>
    setStaleNotice({
      key: `vacation-stale-${id}-${target?.estado ?? "gone"}`,
      message: target ? vacationEstadoChangedMessage(target.estado) : VACATION_GONE_MESSAGE,
    });

  // Un id que ya no aplica no puede quedar colgado (un refetch posterior
  // reabriría el diálogo solo). Ajuste en RENDER, no en un efecto
  // (`react-hooks/set-state-in-effect`). Aprobar, rechazar y borrar no se tocan
  // mientras su acción está en vuelo (`busyIds`, `isApproving`,
  // `isCheckingDelete`): el cambio de estado es el suyo y lo cierra su propio
  // flujo, sin aviso.
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
  // En el borrado se compara contra el estado de APERTURA. Mientras se verifica
  // no se toca: el resultado lo decide `handleConfirmDelete`.
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
      // `id` estable: un doble render no duplica el aviso.
      toast.error(staleNotice.message, { id: staleNotice.key });
    }
  }, [staleNotice]);

  // La confirmación FUERTE depende del estado de APERTURA, no del de la caché.
  const isApprovedDelete = deleteRequest?.estado === ESTADO_APROBADO;

  /**
   * Borrado (pendiente) o anulación (aprobada) con guarda previa: el backend
   * borra en cualquier estado, así que se lee el registro FRESCO y solo se
   * envía el DELETE si sigue en el estado con que se abrió la confirmación.
   * `stale` cierra (ya se avisó e invalidó); `error` deja la confirmación
   * abierta para reintentar. Si pasa, el DELETE sale como siempre (optimista).
   */
  const handleConfirmDelete = async () => {
    if (!deleteRequest || checkingDeleteRef.current) return;
    checkingDeleteRef.current = true;
    setIsCheckingDelete(true);
    try {
      const check = await verifyVacationEstado(queryClient, deleteRequest.id, deleteRequest.estado);
      if (check === "ok") {
        deleteVacation(deleteRequest.id);
      }
      if (check !== "error") {
        setDeleteRequest(null);
      }
    } finally {
      checkingDeleteRef.current = false;
      setIsCheckingDelete(false);
    }
  };

  return (
    <VacationRowActionsProvider
      value={{
        onView: (vacation) => setDetailTargetId(vacation.id),
        onEdit: handleEdit,
        onApprove: (vacation) => setApproveTargetId(vacation.id),
        onReject: (vacation) => setRejectTargetId(vacation.id),
        onDelete: (vacation) => setDeleteRequest({ id: vacation.id, estado: vacation.estado }),
        busyIds,
      }}
    >
      <DataTable
        columns={columns}
        data={rows}
        // Ata la identidad de la fila al id del registro y no a su índice:
        // aprobar/rechazar mueve filas entre filtros y borrar las recorre.
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar solicitud..."
        filterConfig={filterConfig}
        isLoading={isLoading}
        isError={isInitialError}
        errorTitle="Error al cargar vacaciones"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando vacaciones"
        actionButton={
          canEditHr ? (
            <MainDialog
              title={
                <DialogHeader
                  title={selectedVacation ? "Editar Solicitud de Vacaciones" : "Alta de Vacaciones"}
                  subtitle={selectedVacation ? "Edición de registro" : "Registro Nuevo"}
                  statusColor="sky"
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
                  + Nueva Solicitud
                </Button>
              }
            >
              <VacationForm
                onSuccess={() => setIsFormOpen(false)}
                vacationToEdit={selectedVacation}
              />
            </MainDialog>
          ) : null
        }
      />

      {detailTarget && (
        <VacationDetailDialog
          vacation={detailTarget}
          open
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {/*
        Sin optimista: queda abierto y bloqueado (`busy`) hasta que el servidor
        responde y el listado se refresca; entonces se cierra.
      */}
      {canApproveHr && approveTarget && (approveTarget.estado === ESTADO_PENDIENTE || isApproving) && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setApproveTargetId(null);
          }}
          title="Aprobar Vacaciones"
          description={`¿Aprobar la solicitud de ${approveTarget.empleado_nombre} (${formatVacationRange(
            approveTarget
          )}, ${diasLabel(approveTarget.dias_solicitados)})? Quedará registrado quién la aprobó y cuándo.`}
          confirmText={isApproving ? "Aprobando…" : "Aprobar"}
          confirmColor="green"
          closeOnConfirm={false}
          busy={isApproving}
          onConfirm={() =>
            approveVacation(approveTarget.id, {
              onSettled: () => setApproveTargetId(null),
            })
          }
        />
      )}

      {/*
        Sigue montado mientras su rechazo está en vuelo, aunque el refetch ya lo
        muestre rechazado: así su propio `onClose` limpia el id y la vía rápida
        no lo confunde con un cambio ajeno.
      */}
      {canApproveHr &&
        rejectTarget &&
        (rejectTarget.estado === ESTADO_PENDIENTE || busyIds.includes(rejectTarget.id)) && (
        <VacationRejectDialog
          key={rejectTarget.id}
          vacation={rejectTarget}
          onClose={() => setRejectTargetId(null)}
        />
      )}

      {/*
        Pendiente: confirmación normal. Aprobada: confirmación FUERTE, porque
        eliminarla es la única forma de anularla y borra también su registro
        de aprobación. Una rechazada nunca llega aquí. Queda abierta y
        bloqueada (`busy`) mientras se verifica el estado en el servidor.
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
          title={isApprovedDelete ? "Anular Vacaciones Aprobadas" : "Eliminar Solicitud de Vacaciones"}
          description={
            isApprovedDelete
              ? `Vas a ELIMINAR DEFINITIVAMENTE las vacaciones aprobadas de ${deleteTarget.empleado_nombre} (${formatVacationRange(
                  deleteTarget
                )}). Es la única forma de anularlas: la solicitud y todo su registro de aprobación (quién la aprobó y cuándo) se borran y no se pueden recuperar. Esta acción es irreversible.`
              : "¿Estás seguro de que deseas eliminar esta solicitud de vacaciones? Esta acción no se puede deshacer."
          }
          confirmText={
            isCheckingDelete
              ? "Verificando…"
              : isApprovedDelete
                ? "Sí, eliminar definitivamente"
                : "Eliminar"
          }
          onConfirm={() => void handleConfirmDelete()}
          confirmColor="red"
        />
      )}
    </VacationRowActionsProvider>
  );
}
