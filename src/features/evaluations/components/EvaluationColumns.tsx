import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DeleteIcon, EditIcon } from "@/src/components/Icons";
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
import { Evaluation } from "../interfaces/evaluation.interface";
import {
  ESTADO_EVALUACION_CFG,
  PERIODO_EVALUACION_OPTIONS,
  TIPO_EVALUACION_OPTIONS,
} from "../constants/evaluationChoices";
import { useEvaluationRowActionsContext } from "../hooks/useEvaluationRowActions";
import {
  canDeleteEvaluation,
  getEvaluationEstadoText,
  getEvaluationPeriodoText,
  getEvaluationTipoText,
} from "../utils/evaluationRows";

/**
 * Fila de la tabla: la evaluación tal como llega del backend más los nombres
 * de sus dos FK (ambos contra el catálogo de empleados) ya resueltos. Es un
 * modelo de vista, no un tipo del backend.
 *
 * Los nombres viajan EN LA FILA y no se resuelven dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las evaluaciones pueden llegar antes que el catálogo, el
 * accessor se congelaría con el respaldo en pantalla, en la búsqueda y en el
 * orden. Construyendo las filas en `EvaluationList` (`buildEvaluationRows`),
 * la llegada del catálogo produce un `data` nuevo y TanStack recalcula todo.
 * Mismo arreglo que `IncidentRow`.
 *
 * Los dos son SIEMPRE string, ya con su respaldo ("Empleado #N" si el id no
 * está en el catálogo; "Sin evaluador" si `evaluador` es `null`), para que las
 * columnas nunca queden fuera de la búsqueda global.
 */
export type EvaluationRow = Evaluation & {
  empleado_nombre: string;
  evaluador_nombre: string;
};

const columnHelper = createColumnHelper<EvaluationRow>();

interface EvaluationColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre del evaluado ES el menú de la fila: sin columna aparte de
 * "Acciones". El `estado` va en su propia columna, con su badge y su filtro
 * (regla de EC-636 para los registros de RH por empleado). Los callbacks y el
 * "en vuelo" llegan por contexto; el diálogo vive en `EvaluationList`. Sin
 * "Ver detalle": las evaluaciones no tienen vista de detalle.
 */
function EvaluationNameCell({
  evaluation,
  permissions,
}: {
  evaluation: EvaluationRow;
  permissions: EvaluationColumnPermissions;
}) {
  const { onEdit, onDelete, busyIds } = useEvaluationRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(evaluation), visible: permissions.canEdit },
    // Borrado FÍSICO; quién lo ofrece lo decide `canDeleteEvaluation`.
    {
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(evaluation),
      disabled: busyIds.includes(evaluation.id),
      visible: permissions.canDelete && canDeleteEvaluation(evaluation.estado),
    },
  ];

  return <FolioActionMenu name={evaluation.empleado_nombre} items={items} />;
}

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en vuelo" llegan al menú por contexto,
 * nunca por aquí.
 */
export const getColumns = (permissions: EvaluationColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `EvaluationRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <EvaluationNameCell evaluation={row.original} permissions={permissions} />,
    }),
    // El accessor devuelve la fecha YA formateada para que la búsqueda global
    // encuentre lo que se ve en pantalla; el orden va sobre el ISO crudo.
    // `formatLocalDate` parsea el DateField como fecha LOCAL: no se corre un día.
    columnHelper.accessor((row) => formatLocalDate(row.fecha), {
      id: "fecha",
      header: "Fecha",
      sortingFn: (rowA, rowB) => rowA.original.fecha.localeCompare(rowB.original.fecha),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("evaluador_nombre", {
      id: "evaluador",
      header: "Evaluador",
      cell: ({ row, getValue }) => (
        <span
          className={
            row.original.evaluador === null
              ? "text-slate-400 dark:text-slate-500 italic"
              : "text-slate-500 dark:text-slate-400"
          }
        >
          {getValue()}
        </span>
      ),
    }),
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su opción de filtro).
    columnHelper.accessor((row) => getEvaluationTipoText(row.tipo), {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getEvaluationPeriodoText(row.periodo), {
      id: "periodo",
      header: "Periodo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getEvaluationEstadoText(row.estado), {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_EVALUACION_CFG} />
      ),
    }),
    // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final en
    // ambas direcciones. Fuera de la búsqueda global de forma explícita: con
    // `undefined` en la primera fila TanStack la excluiría igual, pero solo a
    // veces según el orden de los datos. Mismo trato que capacitaciones.
    columnHelper.accessor((row) => row.puntaje ?? undefined, {
      id: "puntaje",
      header: "Puntaje",
      meta: { align: "right" },
      // Decimal como string ("85.00"): se compara como número.
      sortingFn: (rowA, rowB, columnId) =>
        Number(rowA.getValue(columnId)) - Number(rowB.getValue(columnId)),
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    // Texto libre: buscable (siempre string), pero sin orden.
    columnHelper.accessor((row) => row.comentarios || "—", {
      id: "comentarios",
      header: "Comentarios",
      enableSorting: false,
      cell: (info) =>
        info.getValue() === "—" ? (
          <span className="text-slate-400">—</span>
        ) : (
          <span
            className="block max-w-64 truncate text-slate-500 dark:text-slate-400"
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
    }),
  ] as ColumnDef<EvaluationRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * El empleado compara contra el FK crudo, rotulado con el nombre resuelto de
 * la fila (o su respaldo `#N`, el mismo texto que la celda), con buscador; el
 * evaluador igual, con las evaluaciones sin evaluador agrupadas primero. El
 * estado, con ficha "Estatus: …", y el tipo y el periodo ofrecen su catálogo
 * completo aunque ninguna fila lo use, y al final cada código desconocido de
 * las filas, crudo (igual que su celda). La fecha filtra por mes. Puntaje y
 * comentarios no llevan filtro: son libres, los cubren el orden y la búsqueda.
 */
export const EVALUATION_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<EvaluationRow>>> = {
  empleado: employeeHeaderFilter(),
  fecha: { type: "month", get: (r) => r.fecha },
  evaluador: {
    type: "distinct",
    get: (r) => r.evaluador,
    label: (r) => r.evaluador_nombre,
    searchable: true,
    emptyOption: "Sin evaluador",
  },
  tipo: { type: "options", get: (r) => r.tipo, options: TIPO_EVALUACION_OPTIONS },
  periodo: { type: "options", get: (r) => r.periodo, options: PERIODO_EVALUACION_OPTIONS },
  estado: estadoHeaderFilter(optionsFromConfig(ESTADO_EVALUACION_CFG)),
};
