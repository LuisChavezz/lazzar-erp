import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import {
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
  RejectIcon,
} from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate } from "@/src/utils/formatDate";
import { getMexicoTimeHHMM } from "@/src/utils/mexicoTime";
import {
  ESTADO_ASISTENCIA_CFG,
  getEstadoAsistenciaLabel,
} from "../constants/attendanceChoices";
import type { Attendance } from "../interfaces/attendance.interface";
import { justificationModeFor } from "../hooks/useAttendanceRecordDialogs";
import {
  useAttendanceRowActionsContext,
  type AttendancePermissions,
  type AttendanceRecordActions,
} from "../hooks/useAttendanceRowActions";
import type { AttendanceRow } from "../utils/attendanceRows";
import { isEmployeeDayBusy } from "../utils/attendanceRowTarget";

// ─── Celdas compartidas por el pase de lista y el historial ──────────────────

/** Hora local de México ("HH:MM") de un datetime de la API, o "—". */
export function TimeCell({ value }: { value: string | null }) {
  const hhmm = getMexicoTimeHHMM(value);
  return (
    <span className="text-slate-600 dark:text-slate-300 tabular-nums">{hhmm || "—"}</span>
  );
}

/** Minutos de retardo, solo cuando hay (> 0). */
export function RetardoCell({ minutos }: { minutos: number | null }) {
  return minutos && minutos > 0 ? (
    <span className="text-amber-600 dark:text-amber-400 font-medium tabular-nums">
      {minutos} min
    </span>
  ) : (
    <span className="text-slate-400">—</span>
  );
}

/** Horas (decimal como string del backend), o "—" mientras no haya salida. */
export function HorasCell({ value }: { value: string | null }) {
  return value !== null ? (
    <span className="text-slate-600 dark:text-slate-300 tabular-nums">{value} h</span>
  ) : (
    <span className="text-slate-400">—</span>
  );
}

export function EstadoBadge({ estado }: { estado: Attendance["estado"] }) {
  return <StatusBadge status={estado} config={ESTADO_ASISTENCIA_CFG} />;
}

/** Nombre del empleado con su número de empleado debajo. */
export function EmployeeCell({ nombre, numero }: { nombre: string; numero: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-medium text-slate-700 dark:text-slate-200">{nombre}</span>
      {numero && <span className="text-[11px] text-slate-400 tabular-nums">{numero}</span>}
    </div>
  );
}

// ─── Acciones sobre un registro ───────────────────────────────────────────────

/**
 * Acciones de un registro EXISTENTE según la matriz de permisos (decisión 3):
 *
 * - "Corregir" (`E-RH`): horas y observaciones; nunca cambia `estado`.
 * - "Justificar" (`D-RH`): solo sobre `falta` o `retardo` (un registro
 *   puntual no tiene nada que justificar).
 * - "Quitar justificación" (`D-RH`): solo sobre `justificada`.
 * - "Eliminar" (`D-RH`).
 *
 * Con una mutación en vuelo sobre el día del empleado, todas se deshabilitan.
 */
export const buildRecordMenuItems = (
  record: AttendanceRow,
  permissions: AttendancePermissions,
  actions: AttendanceRecordActions,
  isBusy: boolean
): ActionMenuItem[] => {
  const items: ActionMenuItem[] = [];
  if (permissions.canCapture) {
    items.push({
      label: "Corregir",
      icon: EditIcon,
      onSelect: () => actions.onCorrect(record),
      disabled: isBusy,
    });
  }
  if (permissions.canManage) {
    const mode = justificationModeFor(record.estado);
    if (mode) {
      items.push({
        label: mode === "justificar" ? "Justificar" : "Quitar justificación",
        icon: mode === "justificar" ? CheckCircleIcon : RejectIcon,
        onSelect: () => actions.onToggleJustification(record),
        disabled: isBusy,
      });
    }
    items.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => actions.onDelete(record),
      disabled: isBusy,
    });
  }
  return items;
};

function HistoryRowActionsMenu({
  record,
  permissions,
}: {
  record: AttendanceRow;
  permissions: AttendancePermissions;
}) {
  const { record: actions, pending } = useAttendanceRowActionsContext();
  const isBusy = isEmployeeDayBusy(pending, record.empleado, record.fecha);
  return (
    <div className="flex justify-center">
      <ActionMenu
        items={buildRecordMenuItems(record, permissions, actions, isBusy)}
        ariaLabel="Acciones del registro de asistencia"
      />
    </div>
  );
}

// ─── Columnas del historial ───────────────────────────────────────────────────

const columnHelper = createColumnHelper<AttendanceRow>();

/**
 * Columnas del HISTORIAL. Solo dependen de los permisos (estables durante la
 * sesión): callbacks y "en vuelo" llegan al menú por contexto.
 */
export const getHistoryColumns = (permissions: AttendancePermissions) =>
  [
    // El accessor devuelve la fecha YA formateada para que la búsqueda global
    // encuentre lo que se ve; el orden va sobre la ISO cruda.
    columnHelper.accessor((row) => formatLocalDate(row.fecha), {
      id: "fecha",
      header: "Fecha",
      sortingFn: (rowA, rowB) => rowA.original.fecha.localeCompare(rowB.original.fecha),
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row }) => (
        <EmployeeCell nombre={row.original.empleado_nombre} numero={row.original.numero_empleado} />
      ),
    }),
    columnHelper.accessor("turno_nombre", {
      id: "turno_nombre",
      header: "Turno",
      meta: { hideOnMobile: true },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getEstadoAsistenciaLabel(row.estado) ?? row.estado, {
      id: "estado_label",
      header: "Estado",
      cell: ({ row }) => <EstadoBadge estado={row.original.estado} />,
    }),
    columnHelper.accessor("hora_entrada", {
      id: "hora_entrada",
      header: "Entrada",
      enableGlobalFilter: false,
      sortingFn: (rowA, rowB) =>
        (rowA.original.hora_entrada ?? "").localeCompare(rowB.original.hora_entrada ?? ""),
      cell: (info) => <TimeCell value={info.getValue()} />,
    }),
    columnHelper.accessor("hora_salida", {
      id: "hora_salida",
      header: "Salida",
      enableGlobalFilter: false,
      sortingFn: (rowA, rowB) =>
        (rowA.original.hora_salida ?? "").localeCompare(rowB.original.hora_salida ?? ""),
      cell: (info) => <TimeCell value={info.getValue()} />,
    }),
    columnHelper.accessor("minutos_retardo", {
      id: "minutos_retardo",
      header: "Retardo",
      meta: { align: "right" },
      enableGlobalFilter: false,
      cell: (info) => <RetardoCell minutos={info.getValue()} />,
    }),
    columnHelper.accessor((row) => Number(row.horas_normales ?? -1), {
      id: "horas_normales",
      header: "Horas normales",
      meta: { align: "right", hideOnMobile: true },
      enableGlobalFilter: false,
      cell: ({ row }) => <HorasCell value={row.original.horas_normales} />,
    }),
    columnHelper.accessor((row) => Number(row.horas_extra ?? -1), {
      id: "horas_extra",
      header: "Horas extra",
      meta: { align: "right", hideOnMobile: true },
      enableGlobalFilter: false,
      cell: ({ row }) => <HorasCell value={row.original.horas_extra} />,
    }),
    columnHelper.accessor((row) => row.observaciones ?? "", {
      id: "observaciones",
      header: "Observaciones",
      meta: { hideOnMobile: true },
      cell: (info) => (
        <span
          className="block max-w-56 truncate text-slate-500 dark:text-slate-400"
          title={info.getValue() || undefined}
        >
          {info.getValue() || "—"}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => <HistoryRowActionsMenu record={row.original} permissions={permissions} />,
    }),
  ] as ColumnDef<AttendanceRow>[];
