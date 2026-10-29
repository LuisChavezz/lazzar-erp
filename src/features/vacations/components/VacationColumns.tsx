import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CheckCircleIcon, DeleteIcon, EditIcon, RejectIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
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
 * respaldo. Mismo arreglo que `ContractRow` (ver `buildVacationRows`).
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
 * El nombre del empleado ES el menú de la fila ("Ver detalle" primero): sin
 * columna aparte de "Acciones". El `estado` va en su propia columna, con su
 * badge y su filtro (esquema de Contratos).
 * Acciones según el estado (D4):
 *
 * - pendiente: editar, aprobar, rechazar y eliminar.
 * - aprobada: solo lectura; eliminarla es la única forma de anularla.
 * - rechazada: solo lectura, sin eliminar.
 *
 * Los callbacks y el "en vuelo" llegan por contexto; los diálogos viven en
 * `VacationList`.
 */
function VacationNameCell({
  vacation,
  permissions,
}: {
  vacation: VacationRow;
  permissions: VacationColumnPermissions;
}) {
  const { onView, onEdit, onApprove, onReject, onDelete, busyIds } = useVacationRowActionsContext();
  const isBusy = busyIds.includes(vacation.id);
  const isPending = vacation.estado === ESTADO_PENDIENTE;

  const items: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(vacation),
      disabled: isBusy,
      visible: isPending && permissions.canEdit,
    },
    {
      label: "Aprobar",
      icon: CheckCircleIcon,
      onSelect: () => onApprove(vacation),
      disabled: isBusy,
      visible: isPending && permissions.canApprove,
    },
    {
      label: "Rechazar",
      icon: RejectIcon,
      onSelect: () => onReject(vacation),
      disabled: isBusy,
      visible: isPending && permissions.canApprove,
    },
    {
      label: isPending ? "Eliminar" : "Anular (eliminar)",
      icon: DeleteIcon,
      onSelect: () => onDelete(vacation),
      disabled: isBusy,
      visible: permissions.canDelete && (isPending || vacation.estado === ESTADO_APROBADO),
    },
  ];

  return (
    <FolioActionMenu
      name={vacation.empleado_nombre}
      detail={{ onSelect: () => onView(vacation) }}
      items={items}
    />
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en vuelo" llegan al menú por contexto.
 */
export const getColumns = (permissions: VacationColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `VacationRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <VacationNameCell vacation={row.original} permissions={permissions} />,
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
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su badge y su filtro).
    columnHelper.accessor((row) => getEstadoVacacionLabel(row.estado) ?? row.estado, {
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
  ] as ColumnDef<VacationRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * El empleado compara contra el FK crudo, rotulado con el nombre resuelto de
 * la fila (o su respaldo `#N`, el mismo texto que la celda), con buscador. El
 * estado, con ficha "Estatus: …", ofrece el catálogo completo aunque ninguna
 * fila lo use, y al final cada código desconocido de las filas, crudo (igual
 * que su badge). El periodo filtra por su mes de inicio y la solicitud por su
 * mes. Los días no llevan filtro: es un número libre.
 */
export const VACATION_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<VacationRow>>> = {
  empleado: {
    type: "distinct",
    get: (r) => r.empleado,
    label: (r) => r.empleado_nombre,
    searchable: true,
  },
  estado: { type: "options", filterLabel: "estatus", get: (r) => r.estado, options: optionsFromConfig(ESTADO_VACACION_CFG) },
  periodo: { type: "month", get: (r) => r.fecha_inicio },
  fecha_solicitud: { type: "month", get: (r) => r.fecha_solicitud },
};
