import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CheckCircleIcon, DeleteIcon, EditIcon, RejectIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { formatLocalDateRange, formatShortDate } from "@/src/utils/formatDate";
import { Absence } from "../interfaces/absence.interface";
import {
  ESTADO_APROBADO,
  ESTADO_AUSENCIA_FILTER_OPTIONS,
  ESTADO_PENDIENTE,
  getAusenciaVocabulary,
  getEstadoAusenciaCfg,
  getEstadoAusenciaLabel,
  TIPO_AUSENCIA_OPTIONS,
} from "../constants/absenceChoices";
import { useAbsenceRowActionsContext } from "../hooks/useAbsenceRowActions";
import { getAbsenceTipoText } from "../utils/absenceRows";

/**
 * Fila de la tabla: el registro tal como llega del backend más los nombres de
 * sus FK ya resueltos. Los nombres viajan EN LA FILA (no en el accessor) para
 * que un catálogo que llega tarde recalcule celda, búsqueda y orden. Mismo
 * arreglo que `VacationRow` (ver `buildAbsenceRows`).
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
 * El nombre del empleado ES el menú de la fila ("Ver detalle" primero): sin
 * columna aparte de "Acciones". El `estado` va en su propia columna, con su
 * badge y su filtro (esquema de Contratos).
 * Acciones según el estado (mismas reglas que vacaciones):
 *
 * - pendiente: editar, aprobar/confirmar, rechazar/descartar y eliminar.
 * - aprobado: solo lectura; eliminar es la única forma de anularlo.
 * - rechazado: solo lectura, sin eliminar.
 *
 * Las etiquetas de aprobar/rechazar salen del vocabulario del tipo (D2).
 */
function AbsenceNameCell({
  absence,
  permissions,
}: {
  absence: AbsenceRow;
  permissions: AbsenceColumnPermissions;
}) {
  const { onView, onEdit, onApprove, onReject, onDelete, busyIds } = useAbsenceRowActionsContext();
  const isBusy = busyIds.includes(absence.id);
  const isPending = absence.estado === ESTADO_PENDIENTE;
  const vocabulary = getAusenciaVocabulary(absence.tipo);

  const items: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(absence),
      disabled: isBusy,
      visible: isPending && permissions.canEdit,
    },
    {
      label: vocabulary.approveAction,
      icon: CheckCircleIcon,
      onSelect: () => onApprove(absence),
      disabled: isBusy,
      visible: isPending && permissions.canApprove,
    },
    {
      label: vocabulary.rejectAction,
      icon: RejectIcon,
      onSelect: () => onReject(absence),
      disabled: isBusy,
      visible: isPending && permissions.canApprove,
    },
    {
      label: isPending ? "Eliminar" : "Anular (eliminar)",
      icon: DeleteIcon,
      onSelect: () => onDelete(absence),
      disabled: isBusy,
      visible: permissions.canDelete && (isPending || absence.estado === ESTADO_APROBADO),
    },
  ];

  return (
    <FolioActionMenu
      name={absence.empleado_nombre}
      detail={{ onSelect: () => onView(absence) }}
      items={items}
    />
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos: callbacks y "en vuelo"
 * llegan al menú por contexto.
 */
export const getColumns = (permissions: AbsenceColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `AbsenceRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <AbsenceNameCell absence={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor((row) => getAbsenceTipoText(row.tipo), {
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
    // Etiqueta del tipo: una falta aprobada se lee "Falta confirmada" (D2); el
    // código desconocido, crudo (igual que su badge y su filtro).
    columnHelper.accessor((row) => getEstadoAusenciaLabel(row.tipo, row.estado) ?? row.estado, {
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
  ] as ColumnDef<AbsenceRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * El empleado compara contra el FK crudo, rotulado con el nombre resuelto de
 * la fila (o su respaldo `#N`, el mismo texto que la celda), con buscador. El
 * estado, con ficha "Estatus: …", usa `ESTADO_AUSENCIA_FILTER_OPTIONS` tal
 * cual: el listado mezcla tipos y la etiqueta de un estado depende del tipo,
 * así que sus opciones nombran las dos variantes ("Aprobado / falta
 * confirmada"), no la etiqueta del badge de una fila. El goce de sueldo es un
 * segundo atributo, independiente del estado: su columna lleva su propio
 * filtro booleano. Tipo ofrece su catálogo completo
 * y al final cada código desconocido, crudo (igual que su celda). Periodo y
 * registro filtran por mes.
 */
export const ABSENCE_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<AbsenceRow>>> = {
  empleado: {
    type: "distinct",
    get: (r) => r.empleado,
    label: (r) => r.empleado_nombre,
    searchable: true,
  },
  estado: { type: "options", filterLabel: "estatus", get: (r) => r.estado, options: ESTADO_AUSENCIA_FILTER_OPTIONS },
  tipo: { type: "options", get: (r) => r.tipo, options: TIPO_AUSENCIA_OPTIONS },
  periodo: { type: "month", get: (r) => r.fecha_inicio },
  con_goce_sueldo: {
    type: "boolean",
    get: (r) => r.con_goce_sueldo,
    yes: "Con goce",
    no: "Sin goce",
  },
  fecha_solicitud: { type: "month", get: (r) => r.fecha_solicitud },
};
