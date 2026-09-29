import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CheckInIcon, CheckOutIcon, MarkAbsenceIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  getEstadoAsistenciaLabel,
  SIN_REGISTRO,
  SIN_REGISTRO_CFG,
  SIN_REGISTRO_LABEL,
} from "../constants/attendanceChoices";
import {
  useAttendanceRowActionsContext,
  type AttendancePermissions,
} from "../hooks/useAttendanceRowActions";
import type { RollCallRow } from "../utils/attendanceRows";
import { isEmployeeDayBusy } from "../utils/attendanceRowTarget";
import {
  buildRecordMenuItems,
  EmployeeCell,
  EstadoBadge,
  HorasCell,
  RetardoCell,
  TimeCell,
} from "./AttendanceColumns";

export const SIN_TURNO_LABEL = "Sin turno asignado";

/**
 * Menú de UNA fila del pase de lista (decisión 3):
 *
 * - Sin registro: "Registrar entrada" y "Marcar falta" (`E-RH`). Un empleado
 *   sin turno las ve deshabilitadas: la checada y el alta necesitan turno.
 * - Registro con entrada y sin salida: "Registrar salida" (`E-RH`).
 * - Cualquier registro: las acciones de `buildRecordMenuItems`.
 */
function RollCallRowActionsMenu({
  row,
  permissions,
}: {
  row: RollCallRow;
  permissions: AttendancePermissions;
}) {
  const { record: recordActions, checkIn, pending } = useAttendanceRowActionsContext();
  const isBusy = isEmployeeDayBusy(pending, row.empleado, row.fecha);
  const items: ActionMenuItem[] = [];

  if (checkIn && permissions.canCapture) {
    if (row.record === null) {
      items.push(
        {
          label: "Registrar entrada",
          icon: CheckInIcon,
          onSelect: () => checkIn.onRegisterEntry(row),
          disabled: isBusy || row.sin_turno,
        },
        {
          label: "Marcar falta",
          icon: MarkAbsenceIcon,
          onSelect: () => checkIn.onMarkAbsence(row),
          disabled: isBusy || row.sin_turno || row.turno_actual === null,
        }
      );
    } else if (row.record.hora_entrada !== null && row.record.hora_salida === null) {
      items.push({
        label: "Registrar salida",
        icon: CheckOutIcon,
        onSelect: () => checkIn.onRegisterExit(row),
        disabled: isBusy,
      });
    }
  }

  if (row.record !== null) {
    items.push(...buildRecordMenuItems(row.record, permissions, recordActions, isBusy));
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={items} ariaLabel={`Acciones de ${row.empleado_nombre}`} />
    </div>
  );
}

const columnHelper = createColumnHelper<RollCallRow>();

/**
 * Columnas del PASE DE LISTA. Solo dependen de los permisos: callbacks y "en
 * vuelo" llegan al menú por contexto.
 */
export const getRollCallColumns = (permissions: AttendancePermissions) =>
  [
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row }) => (
        <EmployeeCell nombre={row.original.empleado_nombre} numero={row.original.numero_empleado} />
      ),
    }),
    columnHelper.accessor((row) => row.turno_nombre ?? SIN_TURNO_LABEL, {
      id: "turno_nombre",
      header: "Turno",
      cell: ({ row }) => (
        <div className="flex flex-col">
          {row.original.turno_nombre && (
            <span className="text-slate-600 dark:text-slate-300">{row.original.turno_nombre}</span>
          )}
          {row.original.sin_turno && (
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              {SIN_TURNO_LABEL}
            </span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor(
      (row) =>
        row.estado === SIN_REGISTRO
          ? SIN_REGISTRO_LABEL
          : (getEstadoAsistenciaLabel(row.estado) ?? row.estado),
      {
        id: "estado_label",
        header: "Estado",
        cell: ({ row }) =>
          row.original.record ? (
            <EstadoBadge estado={row.original.record.estado} />
          ) : (
            <StatusBadge status={SIN_REGISTRO} config={SIN_REGISTRO_CFG} />
          ),
      }
    ),
    columnHelper.accessor((row) => row.record?.hora_entrada ?? "", {
      id: "hora_entrada",
      header: "Entrada",
      enableGlobalFilter: false,
      cell: ({ row }) => <TimeCell value={row.original.record?.hora_entrada ?? null} />,
    }),
    columnHelper.accessor((row) => row.record?.hora_salida ?? "", {
      id: "hora_salida",
      header: "Salida",
      enableGlobalFilter: false,
      cell: ({ row }) => <TimeCell value={row.original.record?.hora_salida ?? null} />,
    }),
    columnHelper.accessor((row) => row.record?.minutos_retardo ?? 0, {
      id: "minutos_retardo",
      header: "Retardo",
      meta: { align: "right" },
      enableGlobalFilter: false,
      cell: ({ row }) => <RetardoCell minutos={row.original.record?.minutos_retardo ?? null} />,
    }),
    columnHelper.accessor((row) => Number(row.record?.horas_normales ?? -1), {
      id: "horas_normales",
      header: "Horas normales",
      meta: { align: "right", hideOnMobile: true },
      enableGlobalFilter: false,
      cell: ({ row }) => <HorasCell value={row.original.record?.horas_normales ?? null} />,
    }),
    columnHelper.accessor((row) => Number(row.record?.horas_extra ?? -1), {
      id: "horas_extra",
      header: "Horas extra",
      meta: { align: "right", hideOnMobile: true },
      enableGlobalFilter: false,
      cell: ({ row }) => <HorasCell value={row.original.record?.horas_extra ?? null} />,
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => <RollCallRowActionsMenu row={row.original} permissions={permissions} />,
    }),
  ] as ColumnDef<RollCallRow>[];
