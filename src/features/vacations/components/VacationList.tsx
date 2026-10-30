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
import { VacationIcon } from "@/src/components/Icons";
import { employeeHeaderFilter, withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useDialogSession } from "@/src/hooks/useDialogSession";
import { DIALOG_WIDTH_FORM } from "@/src/constants/dialogWidths";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import {
  getStaleRowDialogNotice,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getInactiveEmployeeLookup } from "@/src/features/employees/utils/inactiveEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useUsers } from "@/src/features/users/hooks/useUsers";
import { formatVacationRange, getColumns, VACATION_HEADER_FILTERS } from "./VacationColumns";
import { Vacation } from "../interfaces/vacation.interface";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  ESTADO_RECHAZADO,
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
import { verifyVacationEstado } from "../hooks/verifyVacationEstado";
import { diasLabel } from "../utils/diasLabel";
import { buildVacationRows } from "../utils/vacationRows";
import { VACATION_STALE_MESSAGES } from "../hooks/vacationErrorMessages";

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
  // Aviso del diálogo de fila que se cerró porque su solicitud cambió por
  // fuera. Se dispara desde un efecto: un toast en pleno render actualizaría
  // otro componente (el Toaster).
  const [staleNotice, setStaleNotice] = useState<StaleRowDialogNotice | null>(null);
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
  const rows = buildVacationRows(vacations, employeeNameById, usersById, isUsersError);

  // El filtro de empleado marca a los dados de baja con " (inactivo)" (el
  // catálogo incluye a los inactivos; ver `employeeHeaderFilter`).
  const isInactiveEmployee = getInactiveEmployeeLookup(employees);
  // Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
  // `VacationRowActionsProvider`, así una acción no remonta las celdas.
  const columns = withHeaderFilters(
    getColumns({
      canEdit: canEditHr,
      canApprove: canApproveHr,
      canDelete: canDeleteHr,
    }),
    rows,
    { ...VACATION_HEADER_FILTERS, empleado: employeeHeaderFilter(isInactiveEmployee) }
  );

  // ── Diálogos de fila, resueltos contra el listado COMPLETO ────────────────
  const findRow = (id: number | null) =>
    id !== null ? (rows.find((row) => row.id === id) ?? null) : null;

  const detailTarget = findRow(detailTargetId);
  const approveTarget = findRow(approveTargetId);
  const rejectTarget = findRow(rejectTargetId);
  const deleteTarget = findRow(deleteRequest?.id ?? null);

  // En vuelo: el "en vuelo" por fila de la caché o la mutación propia, que
  // sigue pendiente hasta que su `onSettled` cierra el diálogo.
  const isApproveBusy =
    approveTargetId !== null && (isApproving || busyIds.includes(approveTargetId));
  const isRejectBusy = rejectTargetId !== null && busyIds.includes(rejectTargetId);

  // Un detalle cuya solicitud desapareció se cierra sin aviso: no había nada
  // en curso. Ajuste en RENDER, no en un efecto
  // (`react-hooks/set-state-in-effect`), igual que los de abajo.
  if (detailTargetId !== null && detailTarget === null) setDetailTargetId(null);

  // Vía rápida contra la caché: un refetch mostró que la solicitud de un
  // diálogo abierto cambió de estado o ya no existe. Se cierra con el mismo
  // aviso que da la guarda de red (`verifyVacationEstado`), para que el
  // diálogo no desaparezca sin explicación. Aprobar y rechazar esperan una
  // pendiente; el borrado, el estado con que se abrió (mientras se verifica no
  // se toca: el resultado lo decide `handleConfirmDelete`).
  const staleApprove = getStaleRowDialogNotice({
    resource: "vacation",
    targetId: approveTargetId,
    target: approveTarget,
    expectedEstado: ESTADO_PENDIENTE,
    isBusy: isApproveBusy,
    messages: VACATION_STALE_MESSAGES,
  });
  if (staleApprove) {
    setApproveTargetId(null);
    setStaleNotice(staleApprove);
  }
  const staleReject = getStaleRowDialogNotice({
    resource: "vacation",
    targetId: rejectTargetId,
    target: rejectTarget,
    expectedEstado: ESTADO_PENDIENTE,
    isBusy: isRejectBusy,
    messages: VACATION_STALE_MESSAGES,
  });
  if (staleReject) {
    setRejectTargetId(null);
    setStaleNotice(staleReject);
  }
  const staleDelete = getStaleRowDialogNotice({
    resource: "vacation",
    targetId: deleteRequest?.id ?? null,
    target: deleteTarget,
    expectedEstado: deleteRequest?.estado ?? ESTADO_PENDIENTE,
    isBusy: isCheckingDelete,
    messages: VACATION_STALE_MESSAGES,
  });
  if (staleDelete) {
    setDeleteRequest(null);
    setStaleNotice(staleDelete);
  }

  useEffect(() => {
    if (staleNotice) {
      // `id` estable: un doble render no duplica el aviso.
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
                  icon={VacationIcon}
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

      {/*
        Montados mientras haya una copia: `open` sale del id, así que al
        cerrarse animan su salida con los datos de la apertura.
      */}
      {detailSession.snapshot && (
        <VacationDetailDialog
          key={`detail-${detailSession.id}`}
          // El detalle sí sigue a los refetch mientras su solicitud exista.
          vacation={detailTarget ?? detailSession.snapshot}
          open={detailTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setDetailTargetId(null);
          }}
        />
      )}

      {/*
        Sin optimista: queda abierto y bloqueado (`busy`) hasta que el servidor
        responde y el listado se refresca; entonces se cierra.
      */}
      {canApproveHr && approveSession.snapshot && (
        <ConfirmDialog
          key={`approve-${approveSession.id}`}
          open={approveTargetId !== null}
          onOpenChange={(open) => {
            if (!open) setApproveTargetId(null);
          }}
          title="Aprobar Vacaciones"
          description={`¿Aprobar la solicitud de ${approveSession.snapshot.empleado_nombre} (${formatVacationRange(
            approveSession.snapshot
          )}, ${diasLabel(approveSession.snapshot.dias_solicitados)})? Quedará registrado quién la aprobó y cuándo.`}
          confirmText={isApproveBusy ? "Aprobando…" : "Aprobar"}
          confirmColor="green"
          closeOnConfirm={false}
          busy={isApproveBusy}
          onConfirm={() => {
            const id = approveSession.snapshot?.id;
            if (id === undefined) return;
            approveVacation(id, {
              onSettled: () => setApproveTargetId(null),
            });
          }}
        />
      )}

      {/*
        Mientras su rechazo está en vuelo la vía rápida no lo toca, aunque el
        refetch ya lo muestre rechazado: su propio `onClose` limpia el id.
      */}
      {canApproveHr && rejectSession.snapshot && (
        <VacationRejectDialog
          key={`reject-${rejectSession.id}`}
          vacation={rejectSession.snapshot}
          open={rejectTargetId !== null}
          onClose={() => setRejectTargetId(null)}
        />
      )}

      {/*
        Pendiente: confirmación normal. Aprobada: confirmación FUERTE, porque
        eliminarla es la única forma de anularla y borra también su registro
        de aprobación. Una rechazada nunca llega aquí. Queda abierta y
        bloqueada (`busy`) mientras se verifica el estado en el servidor.
      */}
      {canDeleteHr &&
        deleteSession.snapshot &&
        deleteSession.snapshot.estado !== ESTADO_RECHAZADO && (
          <ConfirmDialog
            key={`delete-${deleteSession.id}`}
            open={deleteRequest !== null}
            onOpenChange={(open) => {
              if (!open && !isCheckingDelete) setDeleteRequest(null);
            }}
            closeOnConfirm={false}
            busy={isCheckingDelete}
            maxWidth={isApprovedDelete ? "520px" : undefined}
            title={isApprovedDelete ? "Anular Vacaciones Aprobadas" : "Eliminar Solicitud de Vacaciones"}
            description={
              isApprovedDelete
                ? `Vas a ELIMINAR DEFINITIVAMENTE las vacaciones aprobadas de ${deleteSession.snapshot.empleado_nombre} (${formatVacationRange(
                    deleteSession.snapshot
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
