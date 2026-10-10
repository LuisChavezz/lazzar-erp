"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { formatLocalDate } from "@/src/utils/formatDate";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { useAttendance } from "../hooks/useAttendance";
import { useRegisterEntry, useRegisterExit } from "../hooks/useCheckIn";
import { useMarkAbsence } from "../hooks/useMarkAbsence";
import {
  AttendanceRowActionsProvider,
  useAttendancePermissions,
  usePendingAttendanceTargets,
} from "../hooks/useAttendanceRowActions";
import { useAttendanceRecordDialogs } from "../hooks/useAttendanceRecordDialogs";
import { buildRollCallRows, type RollCallRow } from "../utils/attendanceRows";
import { isEmployeeDayBusy, targetOf } from "../utils/attendanceRowTarget";
import { getRollCallColumns } from "./RollCallColumns";
import { AttendanceRecordDialogs } from "./AttendanceRecordDialogs";
import { CheckInTimeDialog, type CheckInKind } from "./CheckInTimeDialog";
import { DateParamInput } from "./DateParamInput";

interface RollCallViewProps {
  /** Día del pase de lista ("YYYY-MM-DD", nunca futuro). */
  fecha: string;
  /** Hoy en México: tope del selector y criterio de "checar con la hora del servidor". */
  today: string;
  showAll: boolean;
  setParams: (patch: Record<string, string | null>) => void;
}

/** ¿La checada pedida sigue aplicando a la fila? (entrada: sin registro; salida: con entrada y sin salida). */
const checkInApplies = (kind: CheckInKind, row: RollCallRow | null): boolean => {
  if (!row) return false;
  if (kind === "entrada") return row.record === null;
  return row.record !== null && row.record.hora_entrada !== null && row.record.hora_salida === null;
};

/**
 * PASE DE LISTA: un día (hoy por defecto) cruzado contra la plantilla activa.
 * Es donde vive el checador.
 *
 * - El día va al SERVIDOR (`?fecha=`), fuera de `DataTable`; la tabla solo
 *   busca en memoria.
 * - Las filas las arma `buildRollCallRows` (ver sus reglas de visibilidad).
 * - Hoy, "Registrar entrada/salida" checa con la hora del servidor, sin
 *   diálogo. En un día pasado abre `CheckInTimeDialog` para capturar la hora.
 * - Todos los diálogos viven AQUÍ, nunca en la celda: checar o corregir cambia
 *   el estado de la fila y la tabla la reordena u oculta.
 */
export function RollCallView({ fecha, today, showAll, setParams }: RollCallViewProps) {
  const queryClient = useQueryClient();
  const permissions = useAttendancePermissions();
  const pending = usePendingAttendanceTargets();

  const {
    employees,
    isLoading: isLoadingEmployees,
    isInitialError: isEmployeesError,
    error: employeesError,
  } = useEmployees();
  const { shifts, isLoading: isLoadingShifts, isInitialError: isShiftsError } = useShifts();
  const {
    records,
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAttendance({ fecha }, { toastId: "attendance-roll-call-refetch-error" });

  const { mutate: registerEntry } = useRegisterEntry();
  const { mutate: registerExit } = useRegisterExit();
  const { mutate: markAbsence } = useMarkAbsence();

  const isToday = fecha === today;

  const { rows, hiddenCount } = buildRollCallRows(
    records,
    {
      employees,
      employeesLoaded: !isLoadingEmployees && !isEmployeesError,
      shifts,
      shiftsLoaded: !isLoadingShifts && !isShiftsError,
    },
    fecha,
    showAll
  );
  const dayRecords = rows.flatMap((row) => (row.record ? [row.record] : []));

  // Cambio de día en curso: `keepPreviousData` sigue mostrando el día anterior
  // mientras llega el nuevo. Se trata como carga: esas filas no son del día
  // elegido y sus acciones apuntarían a otro día.
  const isSwitchingDay = isFetching && isPlaceholderData;
  // "Asentado" = datos del día ACTUAL, sin petición en vuelo.
  const listSettled = hasLoaded && !isFetching && !isPlaceholderData;

  const dialogs = useAttendanceRecordDialogs(dayRecords, pending, listSettled);

  // ── Checada con hora (días pasados) ───────────────────────────────────────
  // `failed`: la checada de este diálogo ya falló (el toast de error lo dijo).
  const [checkInRequest, setCheckInRequest] = useState<{
    kind: CheckInKind;
    empleado: number;
    failed: boolean;
  } | null>(null);
  const checkInRow = checkInRequest
    ? (rows.find((row) => row.empleado === checkInRequest.empleado) ?? null)
    : null;

  // Si un refetch muestra que la checada ya no aplica (otra persona registró
  // la entrada, o borró el registro), el diálogo se cierra. Mientras su propia
  // checada está en vuelo no se toca. El aviso va por el mecanismo ÚNICO de
  // `useAttendanceRecordDialogs`, y se omite si la propia checada ya falló: su
  // toast de error ya explicó el cambio. Ajuste en RENDER.
  if (
    listSettled &&
    checkInRequest !== null &&
    !isEmployeeDayBusy(pending, checkInRequest.empleado, fecha) &&
    !checkInApplies(checkInRequest.kind, checkInRow)
  ) {
    setCheckInRequest(null);
    if (!checkInRequest.failed) {
      dialogs.notifyStale(
        `attendance-checkin-stale-${checkInRequest.empleado}-${fecha}`,
        "El registro del día cambió mientras capturabas la hora. Se actualizó el pase de lista."
      );
    }
  }

  const columns = getRollCallColumns(permissions);

  // Las banderas son de carga INICIAL (`useAttendance`, `useEmployees` y
  // `useShifts` exponen `isInitialError`): un refetch fallido de cualquiera
  // conserva el pase de lista ya cargado —filas, filtro por día laboral y
  // nombres de turno— y avisa por toast desde su hook.
  const showError = isInitialError || isEmployeesError;

  return (
    <AttendanceRowActionsProvider
      value={{
        record: {
          onOpenBreakdown: dialogs.openBreakdown,
          onCorrect: dialogs.openCorrect,
          onToggleJustification: dialogs.openJustification,
          onDelete: dialogs.openDelete,
        },
        checkIn: {
          onRegisterEntry: (row) =>
            isToday
              ? registerEntry({ target: targetOf(row) })
              : setCheckInRequest({ kind: "entrada", empleado: row.empleado, failed: false }),
          onRegisterExit: (row) =>
            isToday
              ? registerExit({ target: targetOf(row) })
              : setCheckInRequest({ kind: "salida", empleado: row.empleado, failed: false }),
          onMarkAbsence: (row) => {
            if (row.turno_actual !== null) {
              markAbsence({ target: targetOf(row), turno: row.turno_actual });
            }
          },
        },
        pending,
      }}
    >
      {/* Filtros de SERVIDOR y de vista, fuera de la tabla. */}
      <section className="mb-4 flex flex-col gap-4 md:flex-row md:items-end bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 p-5">
        <div className="md:w-56">
          {/* Solo días completos, con año plausible y no futuros llegan a la
              URL; vaciar el campo vuelve a hoy (ver `DateParamInput`). */}
          <DateParamInput
            label="Día"
            name="fecha"
            value={fecha}
            max={today}
            isAcceptable={(value) => value <= today}
            onCommit={(value) => setParams({ fecha: value && value !== today ? value : null })}
          />
        </div>
        {/* Interruptor compacto junto al día. Mismo aspecto que `FormToggle`,
            sin su marco de ancho completo. */}
        <label
          className="flex items-center gap-3 md:pb-2.5 cursor-pointer select-none text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input
              name="todos"
              type="checkbox"
              className="peer sr-only"
              checked={showAll}
              onChange={(event) => setParams({ todos: event.target.checked ? "1" : null })}
            />
            <span className="absolute inset-0 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors peer-checked:bg-sky-500 peer-focus-visible:ring-2 peer-focus-visible:ring-sky-500" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
          </span>
          Incluir empleados en su día de descanso
          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
            {hiddenCount} en descanso
          </span>
        </label>
      </section>

      <DataTable
        columns={columns}
        data={rows}
        // La fila es el empleado: checar, marcar falta o borrar cambian su
        // estado sin que deje de ser la misma fila.
        getRowId={(row) => String(row.empleado)}
        searchPlaceholder="Buscar empleado..."
        // Refresca también los dos catálogos: tras un refetch fallido de
        // empleados o turnos la tabla sigue en pantalla (sin "Reintentar"), y
        // este botón es la única vía para volver a pedirlos sin salir.
        onRefetch={async () => {
          await Promise.all([
            refetch(),
            queryClient.refetchQueries({ queryKey: ["employees"], exact: true }),
            queryClient.refetchQueries({ queryKey: ["shifts"], exact: true }),
          ]);
        }}
        isRefetching={isFetching}
        emptyMessage={`No hay empleados que pasar lista el ${formatLocalDate(fecha)}.`}
        isLoading={isLoading || isSwitchingDay || isLoadingEmployees || isLoadingShifts}
        isError={showError}
        errorTitle="Error al cargar el pase de lista"
        errorMessage={extractErrorMessage(
          error ?? employeesError,
          "No se pudo cargar la información."
        )}
        onErrorRetry={() => {
          void refetch();
          if (isEmployeesError) {
            void queryClient.refetchQueries({ queryKey: ["employees"] });
          }
        }}
        loadingAriaLabel="Cargando el pase de lista"
        paginationResetKey={fecha}
      />

      {isShiftsError && (
        <p className="mt-4 text-xs text-amber-600 dark:text-amber-400">
          No se pudo cargar el catálogo de turnos: no se sabe quién labora este día, así que se
          muestra a todos los empleados activos.
        </p>
      )}

      {permissions.canCapture && checkInRequest && checkInRow && (
        <CheckInTimeDialog
          key={`${checkInRequest.kind}-${checkInRequest.empleado}`}
          kind={checkInRequest.kind}
          row={checkInRow}
          onClose={() => setCheckInRequest(null)}
          onFailed={() =>
            setCheckInRequest((current) => (current ? { ...current, failed: true } : current))
          }
        />
      )}

      <AttendanceRecordDialogs dialogs={dialogs} permissions={permissions} />
    </AttendanceRowActionsProvider>
  );
}
