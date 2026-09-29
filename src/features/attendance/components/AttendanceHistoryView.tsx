"use client";

import { useState } from "react";
import { DataTable, type DataTableFilterConfig } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { useEmployees } from "@/src/features/employees/hooks/useEmployees";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";
import { useShifts } from "@/src/features/shifts/hooks/useShifts";
import { ESTADO_ASISTENCIA_OPTIONS } from "../constants/attendanceChoices";
import { useAttendance } from "../hooks/useAttendance";
import {
  AttendanceRowActionsProvider,
  useAttendancePermissions,
  usePendingAttendanceTargets,
} from "../hooks/useAttendanceRowActions";
import { useAttendanceRecordDialogs } from "../hooks/useAttendanceRecordDialogs";
import { buildAttendanceRows } from "../utils/attendanceRows";
import { isPlausibleDateKey } from "../utils/dateInputs";
import { getHistoryColumns } from "./AttendanceColumns";
import { DateParamInput } from "./DateParamInput";
import { AttendanceRecordDialogs } from "./AttendanceRecordDialogs";

interface AttendanceHistoryViewProps {
  desde: string;
  hasta: string;
  setParams: (patch: Record<string, string | null>) => void;
}

/**
 * HISTORIAL: los registros de un periodo (por defecto la quincena en curso).
 *
 * - `desde`/`hasta` van al SERVIDOR (`fecha__gte`/`fecha__lte`) desde inputs
 *   fuera de `DataTable`, en la URL, como en `BankReconciliationView`. Sin
 *   periodo válido no se consulta: el endpoint no pagina.
 * - Empleado y estado se filtran EN MEMORIA (`filterConfig`), igual que la
 *   búsqueda.
 * - Comparte con el pase de lista los diálogos de corregir, justificar y
 *   eliminar; aquí no se checa.
 */
export function AttendanceHistoryView({ desde, hasta, setParams }: AttendanceHistoryViewProps) {
  const permissions = useAttendancePermissions();
  const pending = usePendingAttendanceTargets();

  const { employees, isLoading: isLoadingEmployees, isError: isEmployeesError } = useEmployees();
  const { shifts, isLoading: isLoadingShifts, isError: isShiftsError } = useShifts();

  // Mismo criterio que los inputs: una URL escrita a mano con "desde=0002-…"
  // tampoco consulta.
  const periodValid = isPlausibleDateKey(desde) && isPlausibleDateKey(hasta) && desde <= hasta;
  const {
    records,
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
    isPlaceholderData,
  } = useAttendance(
    { fecha__gte: desde, fecha__lte: hasta },
    { enabled: periodValid, toastId: "attendance-history-refetch-error" }
  );

  // Los nombres se incorporan a la FILA: la llegada tardía de un catálogo
  // produce un `data` nuevo y TanStack recalcula búsqueda y orden.
  const rows = buildAttendanceRows(records, {
    employees,
    employeesLoaded: !isLoadingEmployees && !isEmployeesError,
    shifts,
    shiftsLoaded: !isLoadingShifts && !isShiftsError,
  });

  const isSwitchingPeriod = isFetching && isPlaceholderData;
  const listSettled = hasLoaded && !isFetching && !isPlaceholderData;
  const dialogs = useAttendanceRecordDialogs(rows, pending, listSettled);

  // Filtros en memoria sobre el valor CRUDO de la fila (`row.empleado`,
  // `row.estado`). Las opciones de empleado salen del catálogo COMPLETO (con
  // los inactivos marcados): un registro histórico sigue siendo de alguien.
  const empleadoFilterOptions = employees
    .map((employee) => ({
      value: String(employee.id),
      label: employee.activo
        ? getEmployeeFullName(employee)
        : `${getEmployeeFullName(employee)} (inactivo)`,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es-MX"));
  const filterConfig: DataTableFilterConfig[] = [
    { id: "empleado", label: "Empleado", options: empleadoFilterOptions },
    { id: "estado", label: "Estado", options: ESTADO_ASISTENCIA_OPTIONS },
  ];

  const columns = getHistoryColumns(permissions);

  // Contador por campo para remontar su input al vaciarlo (ver el JSX).
  const [clearedNonce, setClearedNonce] = useState({ desde: 0, hasta: 0 });
  const commitPeriod = (field: "desde" | "hasta", value: string) => {
    if (value) {
      setParams({ [field]: value });
      return;
    }
    setParams({ [field]: null });
    setClearedNonce((current) => ({ ...current, [field]: current[field] + 1 }));
  };

  return (
    <AttendanceRowActionsProvider
      value={{
        record: {
          onCorrect: dialogs.openCorrect,
          onToggleJustification: dialogs.openJustification,
          onDelete: dialogs.openDelete,
        },
        checkIn: null,
        pending,
      }}
    >
      {/* Periodo de SERVIDOR, fuera de la tabla. */}
      <section className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-white/5 p-5">
        {/* Solo llegan a la URL días completos y con año plausible: teclear
            el año no consulta con valores intermedios (ver `DateParamInput`). */}
        {/* Vaciar un campo quita su parámetro y vuelve el extremo de la
            quincena. Si el campo ya mostraba ese extremo, la URL no cambia y
            el borrador se quedaría vacío: el `key` lo remonta con el valor
            resuelto. */}
        <DateParamInput
          key={`desde-${clearedNonce.desde}`}
          label="Desde"
          name="desde"
          value={desde}
          max={hasta || undefined}
          onCommit={(value) => commitPeriod("desde", value)}
        />
        <DateParamInput
          key={`hasta-${clearedNonce.hasta}`}
          label="Hasta"
          name="hasta"
          value={hasta}
          min={desde || undefined}
          onCommit={(value) => commitPeriod("hasta", value)}
        />
      </section>

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => String(row.id)}
        searchPlaceholder="Buscar por empleado, estado u observaciones..."
        filterConfig={filterConfig}
        onRefetch={periodValid ? refetch : undefined}
        isRefetching={isFetching}
        emptyMessage={
          periodValid
            ? "No hay registros de asistencia en este periodo."
            : isPlausibleDateKey(desde) && isPlausibleDateKey(hasta)
              ? "Selecciona un periodo válido: «Desde» no puede ser posterior a «Hasta»."
              : "Selecciona un periodo válido."
        }
        isLoading={isLoading || isSwitchingPeriod}
        isError={isInitialError}
        errorTitle="Error al cargar el historial de asistencia"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        onErrorRetry={() => void refetch()}
        loadingAriaLabel="Cargando el historial de asistencia"
        // Cambiar el periodo vuelve a la página 1 sin perder orden, búsqueda
        // ni columnas.
        paginationResetKey={`${desde}-${hasta}`}
      />

      <AttendanceRecordDialogs dialogs={dialogs} permissions={permissions} />
    </AttendanceRowActionsProvider>
  );
}
