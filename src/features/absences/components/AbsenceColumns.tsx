import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import {
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
  RejectIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDateRange, formatShortDate } from "@/src/utils/formatDate";
import { Absence } from "../interfaces/absence.interface";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  getAusenciaVocabulary,
  getEstadoAusenciaCfg,
  getEstadoAusenciaLabel,
  getTipoAusenciaLabel,
} from "../constants/absenceChoices";
import { useAbsenceRowActionsContext } from "../hooks/useAbsenceRowActions";

/**
 * Fila de la tabla: el registro tal como llega del backend más los nombres de
 * sus FK ya resueltos. Los nombres viajan EN LA FILA (no en el accessor) para
 * que un catálogo que llega tarde recalcule celda, búsqueda y orden. Mismo
 * arreglo que `VacationRow`.
 */
export type AbsenceRow = Absence & {
  empleado_nombre: string;
  solicitado_por_nombre: string | null;
  autorizado_por_nombre: string | null;
  rechazado_por_nombre: string | null;
};

const columnHelper = createColumnHelper<AbsenceRow>();

/** "1/10/2026 – 5/10/2026": el mismo texto en la celda y en la búsqueda. */
export const formatAbsenceRange = formatLocalDateRange;

export const goceLabel = (conGoce: boolean) => (conGoce ? "Con goce" : "Sin goce");

export interface AbsenceColumnPermissions {
  canEdit: boolean;
  /** Aprobar/confirmar y rechazar/descartar (`D-RH`, como vacaciones). */
  canApprove: boolean;
  canDelete: boolean;
}

/**
 * Menú de acciones de UNA fila, según su estado (mismas reglas que vacaciones):
 *
 * - pendiente: editar, aprobar/confirmar, rechazar/descartar y eliminar.
 * - aprobado: solo lectura; eliminar es la única forma de anularlo.
 * - rechazado: solo lectura, sin eliminar.
 *
 * Las etiquetas de aprobar/rechazar salen del vocabulario del tipo (D2).
 */
function AbsenceRowActionsMenu({
  absence,
  permissions,
}: {
  absence: Absence;
  permissions: AbsenceColumnPermissions;
}) {
  const { onView, onEdit, onApprove, onReject, onDelete, busyIds } = useAbsenceRowActionsContext();
  const isBusy = busyIds.includes(absence.id);
  const vocabulary = getAusenciaVocabulary(absence.tipo);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(absence) },
  ];

  if (absence.estado === ESTADO_PENDIENTE) {
    if (permissions.canEdit) {
      menuItems.push({ label: "Editar", icon: EditIcon, onSelect: () => onEdit(absence), disabled: isBusy });
    }
    if (permissions.canApprove) {
      menuItems.push(
        {
          label: vocabulary.approveAction,
          icon: CheckCircleIcon,
          onSelect: () => onApprove(absence),
          disabled: isBusy,
        },
        {
          label: vocabulary.rejectAction,
          icon: RejectIcon,
          onSelect: () => onReject(absence),
          disabled: isBusy,
        }
      );
    }
    if (permissions.canDelete) {
      menuItems.push({ label: "Eliminar", icon: DeleteIcon, onSelect: () => onDelete(absence), disabled: isBusy });
    }
  } else if (absence.estado === ESTADO_APROBADO && permissions.canDelete) {
    menuItems.push({
      label: "Anular (eliminar)",
      icon: DeleteIcon,
      onSelect: () => onDelete(absence),
      disabled: isBusy,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones del registro" />
    </div>
  );
}

/** Nombre del empleado como disparador del detalle (mismo callback que "Ver detalle"). */
function EmployeeDetailTrigger({ row, name }: { row: AbsenceRow; name: string }) {
  const { onView } = useAbsenceRowActionsContext();
  return (
    <button
      type="button"
      onClick={() => onView(row)}
      title="Ver detalle"
      className="text-left font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
    >
      {name}
    </button>
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos: callbacks y "en vuelo"
 * llegan al menú por contexto.
 */
export const getColumns = (permissions: AbsenceColumnPermissions) =>
  [
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row, getValue }) => <EmployeeDetailTrigger row={row.original} name={getValue()} />,
    }),
    columnHelper.accessor((row) => getTipoAusenciaLabel(row.tipo) ?? "—", {
      id: "tipo",
      header: "Tipo",
      cell: (info) => <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>,
    }),
    // Rango YA formateado para la búsqueda; el orden va sobre las fechas ISO.
    columnHelper.accessor((row) => formatAbsenceRange(row), {
      id: "periodo",
      header: "Periodo",
      sortingFn: (rowA, rowB) =>
        rowA.original.fecha_inicio.localeCompare(rowB.original.fecha_inicio) ||
        rowA.original.fecha_fin.localeCompare(rowB.original.fecha_fin),
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => goceLabel(row.con_goce_sueldo), {
      id: "con_goce_sueldo",
      header: "Goce de sueldo",
      cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    }),
    // Etiqueta del tipo: una falta aprobada se lee "Falta confirmada" (D2).
    columnHelper.accessor((row) => getEstadoAusenciaLabel(row.tipo, row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={getEstadoAusenciaCfg(row.original.tipo)} />
      ),
    }),
    columnHelper.accessor((row) => formatShortDate(row.fecha_solicitud), {
      id: "fecha_solicitud",
      header: "Registrado",
      sortingFn: (rowA, rowB) =>
        (rowA.original.fecha_solicitud ?? "").localeCompare(rowB.original.fecha_solicitud ?? ""),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">{info.getValue()}</span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => <AbsenceRowActionsMenu absence={row.original} permissions={permissions} />,
    }),
  ] as ColumnDef<AbsenceRow>[];
