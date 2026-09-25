import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { DeleteIcon, EditIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Evaluation } from "../interfaces/evaluation.interface";
import {
  ESTADO_COMPLETADA,
  ESTADO_EVALUACION_CFG,
  getEstadoEvaluacionLabel,
  getPeriodoEvaluacionLabel,
  getTipoEvaluacionLabel,
} from "../constants/evaluationChoices";
import {
  useEvaluationRowActionsContext,
  usePendingEvaluationDeleteIds,
} from "../hooks/useEvaluationRowActions";

/**
 * Fila de la tabla: la evaluación tal como llega del backend más los nombres
 * de sus dos FK (ambos contra el catálogo de empleados) ya resueltos. Es un
 * modelo de vista, no un tipo del backend.
 *
 * Los nombres viajan EN LA FILA y no se resuelven dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las evaluaciones pueden llegar antes que el catálogo, el
 * accessor se congelaría con el respaldo en pantalla, en la búsqueda y en el
 * orden. Construyendo las filas en `EvaluationList`, la llegada del catálogo
 * produce un `data` nuevo y TanStack recalcula todo. Mismo arreglo que
 * `IncidentRow`.
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

/**
 * Menú de acciones de UNA fila. Lee los callbacks por contexto y el "en
 * borrado" de la `MutationCache` (ver `useEvaluationRowActions`), así que un
 * borrado en vuelo solo re-renderiza este componente y no remonta las celdas.
 *
 * Es solo presentacional: el diálogo de confirmación vive en `EvaluationList`,
 * porque una celda se desmonta al ordenar, paginar o filtrar.
 */
function EvaluationRowActionsMenu({
  evaluation,
  canEdit,
  canDelete,
}: {
  evaluation: Evaluation;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { onEdit, onDelete } = useEvaluationRowActionsContext();
  const deletingIds = usePendingEvaluationDeleteIds();
  const menuItems: ActionMenuItem[] = [];

  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(evaluation),
    });
  }
  // Borrado FÍSICO y solo sobre evaluaciones pendientes: una completada es un
  // registro cerrado y no ofrece "Eliminar".
  if (canDelete && evaluation.estado !== ESTADO_COMPLETADA) {
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(evaluation),
      disabled: deletingIds.includes(evaluation.id),
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de evaluación" />
    </div>
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en borrado" llegan al menú por contexto,
 * nunca por aquí.
 */
export const getColumns = (permissions: { canEdit: boolean; canDelete: boolean }) => {
  const columns = [
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
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
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
    columnHelper.accessor((row) => getTipoEvaluacionLabel(row.tipo) ?? "—", {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getPeriodoEvaluacionLabel(row.periodo) ?? "—", {
      id: "periodo",
      header: "Periodo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getEstadoEvaluacionLabel(row.estado) ?? "—", {
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

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <EvaluationRowActionsMenu
            evaluation={row.original}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<EvaluationRow>
    );
  }

  return columns;
};
