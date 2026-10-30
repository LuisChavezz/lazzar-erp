import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import {
  CheckCircleIcon,
  ClockIcon,
  DeleteIcon,
  EditIcon,
  RejectIcon,
} from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  employeeHeaderFilter,
  estadoHeaderFilter,
  type HeaderFilterSpec,
} from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
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

/**
 * El nombre del empleado ES el menú de la fila (regla de EC-636 para los
 * registros de RH por empleado), con su número de empleado debajo: sin
 * columna aparte de "Acciones". Sin acciones visibles (sin registro y sin
 * permiso de captura) queda como texto plano.
 */
export function AttendanceNameMenu({
  nombre,
  numero,
  items,
}: {
  nombre: string;
  numero: string;
  items: ActionMenuItem[];
}) {
  return (
    <FolioActionMenu
      name={nombre}
      items={items}
      status={numero ? <span className="text-[11px] text-slate-400 tabular-nums">{numero}</span> : undefined}
    />
  );
}

// ─── Acciones sobre un registro ───────────────────────────────────────────────

/**
 * Acciones de un registro EXISTENTE según la matriz de permisos (decisión 3):
 *
 * - "Desglose de horas" (cualquiera que vea la fila): los tramos de control de
 *   horas del registro. Qué se puede hacer dentro lo decide el diálogo según
 *   los mismos permisos; sin hora de entrada solo se consulta o se borra.
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
  const items: ActionMenuItem[] = [
    {
      label: "Desglose de horas",
      icon: ClockIcon,
      onSelect: () => actions.onOpenBreakdown(record),
      disabled: isBusy,
    },
  ];
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

/** Menú de UNA fila del historial: las acciones de `buildRecordMenuItems`. */
function HistoryNameCell({
  record,
  permissions,
}: {
  record: AttendanceRow;
  permissions: AttendancePermissions;
}) {
  const { record: actions, pending } = useAttendanceRowActionsContext();
  const isBusy = isEmployeeDayBusy(pending, record.empleado, record.fecha);
  return (
    <AttendanceNameMenu
      nombre={record.empleado_nombre}
      numero={record.numero_empleado}
      items={buildRecordMenuItems(record, permissions, actions, isBusy)}
    />
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
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo, ver `AttendanceRow`).
    columnHelper.accessor("empleado_nombre", {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <HistoryNameCell record={row.original} permissions={permissions} />,
    }),
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
    columnHelper.accessor("turno_nombre", {
      id: "turno_nombre",
      header: "Turno",
      meta: { hideOnMobile: true },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su badge y su opción de filtro).
    columnHelper.accessor((row) => getEstadoAsistenciaLabel(row.estado) ?? row.estado, {
      id: "estado",
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
  ] as ColumnDef<AttendanceRow>[];

/**
 * Filtros de encabezado (estilo Excel) del HISTORIAL, para `withHeaderFilters`.
 * Filtran EN MEMORIA el periodo ya consultado (`desde`/`hasta` van al
 * servidor, fuera de la tabla). El empleado compara contra el FK crudo,
 * rotulado con el nombre resuelto de la fila, con buscador. El estado, con
 * ficha "Estatus: …", ofrece el catálogo completo aunque ninguna fila lo use,
 * y al final cada código desconocido de las filas, crudo (igual que su badge).
 */
export const HISTORY_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<AttendanceRow>>> = {
  empleado: employeeHeaderFilter(),
  estado: estadoHeaderFilter(optionsFromConfig(ESTADO_ASISTENCIA_CFG)),
};
