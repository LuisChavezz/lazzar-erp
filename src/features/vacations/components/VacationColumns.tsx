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
import { Vacation } from "../interfaces/vacation.interface";
import {
  ESTADO_APROBADO,
  ESTADO_PENDIENTE,
  ESTADO_VACACION_CFG,
  getEstadoVacacionLabel,
} from "../constants/vacationChoices";
import { useVacationRowActionsContext } from "../hooks/useVacationRowActions";

/**
 * Fila de la tabla: la solicitud tal como llega del backend más los nombres de
 * sus FK ya resueltos (empleado contra el catálogo de empleados; los tres
 * usuarios contra `/usuarios/`). Es un modelo de vista, no un tipo del backend.
 *
 * Los nombres viajan EN LA FILA y no se resuelven dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`, así que un catálogo que llega tarde dejaría congelado el
 * respaldo. Mismo arreglo que `EvaluationRow`.
 *
 * `empleado_nombre` es SIEMPRE string (con respaldo "Empleado #N") para que la
 * columna nunca quede fuera de la búsqueda global. Los de usuario son `null`
 * cuando el FK es `null`: el detalle lo pinta como "Sin registro".
 */
export type VacationRow = Vacation & {
  empleado_nombre: string;
  solicitado_por_nombre: string | null;
  autorizado_por_nombre: string | null;
  rechazado_por_nombre: string | null;
};

const columnHelper = createColumnHelper<VacationRow>();

/** "1/10/2026 – 5/10/2026": el mismo texto en la celda y en la búsqueda. */
export const formatVacationRange = formatLocalDateRange;

export interface VacationColumnPermissions {
  canEdit: boolean;
  /** Aprobar y rechazar (D2: `D-RH`, no hay código de aprobación propio de RH). */
  canApprove: boolean;
  canDelete: boolean;
}

/**
 * Menú de acciones de UNA fila, según su estado (D4):
 *
 * - pendiente: editar, aprobar, rechazar y eliminar.
 * - aprobada: solo lectura; eliminarla es la única forma de anularla.
 * - rechazada: solo lectura, sin eliminar.
 *
 * "Ver detalle" está siempre, sin permiso extra. Lee los callbacks por
 * contexto y el "en vuelo" de la `MutationCache`; es solo presentacional: los
 * diálogos viven en `VacationList`.
 */
function VacationRowActionsMenu({
  vacation,
  permissions,
}: {
  vacation: Vacation;
  permissions: VacationColumnPermissions;
}) {
  const { onView, onEdit, onApprove, onReject, onDelete, busyIds } = useVacationRowActionsContext();
  const isBusy = busyIds.includes(vacation.id);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(vacation) },
  ];

  if (vacation.estado === ESTADO_PENDIENTE) {
    if (permissions.canEdit) {
      menuItems.push({
        label: "Editar",
        icon: EditIcon,
        onSelect: () => onEdit(vacation),
        disabled: isBusy,
      });
    }
    if (permissions.canApprove) {
      menuItems.push(
        {
          label: "Aprobar",
          icon: CheckCircleIcon,
          onSelect: () => onApprove(vacation),
          disabled: isBusy,
        },
        {
          label: "Rechazar",
          icon: RejectIcon,
          onSelect: () => onReject(vacation),
          disabled: isBusy,
        }
      );
    }
    if (permissions.canDelete) {
      menuItems.push({
        label: "Eliminar",
        icon: DeleteIcon,
        onSelect: () => onDelete(vacation),
        disabled: isBusy,
      });
    }
  } else if (vacation.estado === ESTADO_APROBADO && permissions.canDelete) {
    menuItems.push({
      label: "Anular (eliminar)",
      icon: DeleteIcon,
      onSelect: () => onDelete(vacation),
      disabled: isBusy,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de la solicitud" />
    </div>
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en vuelo" llegan al menú por contexto.
 */
export const getColumns = (permissions: VacationColumnPermissions) =>
  [
    // El nombre abre el detalle, igual que un folio en el resto de tablas.
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row, getValue }) => <EmployeeDetailTrigger row={row.original} name={getValue()} />,
    }),
    // El accessor devuelve el rango YA formateado para que la búsqueda global
    // encuentre lo que se ve; el orden va sobre las fechas ISO crudas.
    columnHelper.accessor((row) => formatVacationRange(row), {
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
    // Fuera de la búsqueda global, igual que los numéricos de evaluaciones.
    columnHelper.accessor("dias_solicitados", {
      id: "dias_solicitados",
      header: "Días",
      meta: { align: "right" },
      enableGlobalFilter: false,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => getEstadoVacacionLabel(row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.estado} config={ESTADO_VACACION_CFG} />,
    }),
    columnHelper.accessor((row) => formatShortDate(row.fecha_solicitud), {
      id: "fecha_solicitud",
      header: "Solicitada",
      sortingFn: (rowA, rowB) =>
        (rowA.original.fecha_solicitud ?? "").localeCompare(rowB.original.fecha_solicitud ?? ""),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => (
        <VacationRowActionsMenu vacation={row.original} permissions={permissions} />
      ),
    }),
  ] as ColumnDef<VacationRow>[];

/** Nombre del empleado como disparador del detalle (mismo callback que "Ver detalle"). */
function EmployeeDetailTrigger({ row, name }: { row: VacationRow; name: string }) {
  const { onView } = useVacationRowActionsContext();
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
