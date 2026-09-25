import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Training } from "../interfaces/training.interface";
import {
  ESTADO_CAPACITACION_CFG,
  getEstadoCapacitacionLabel,
} from "../constants/trainingChoices";
import { isHttpUrl } from "../schemas/training.schema";
import {
  usePendingTrainingDeleteIds,
  useTrainingRowActionsContext,
} from "../hooks/useTrainingRowActions";

/**
 * Fila de la tabla: la capacitación tal como llega del backend más el nombre
 * del empleado ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las capacitaciones pueden llegar antes que el catálogo
 * de empleados, el accessor se congelaría con "Empleado #N" en pantalla, en la
 * búsqueda y en el orden. Construyendo las filas en `TrainingList`, la llegada
 * del catálogo produce un `data` nuevo y TanStack recalcula todo. Mismo arreglo
 * que `ContractRow`.
 *
 * `null` = el empleado no aparece en el catálogo (o todavía no llega).
 */
export type TrainingRow = Training & { empleado_nombre: string | null };

const columnHelper = createColumnHelper<TrainingRow>();

/**
 * Menú de acciones de UNA fila. Lee los callbacks por contexto y el "en
 * borrado" de la `MutationCache` (ver `useTrainingRowActions`), así que un
 * borrado en vuelo solo re-renderiza este componente y no remonta las celdas.
 *
 * Es solo presentacional: el diálogo de confirmación vive en `TrainingList`,
 * porque una celda se desmonta al ordenar, paginar o filtrar, y con ella se
 * perdería el diálogo a media interacción.
 */
function TrainingRowActionsMenu({
  training,
  canEdit,
  canDelete,
}: {
  training: Training;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { onEdit, onDelete } = useTrainingRowActionsContext();
  const deletingIds = usePendingTrainingDeleteIds();
  const menuItems: ActionMenuItem[] = [];

  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(training),
    });
  }
  // Borrado FÍSICO. La "cancelación" de negocio no es esto: se hace editando el
  // estado a "Cancelado".
  if (canDelete) {
    menuItems.push({
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(training),
      disabled: deletingIds.includes(training.id),
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de capacitación" />
    </div>
  );
}

/**
 * Orden numérico de un valor ya presente. Los vacíos no llegan aquí: el
 * accessor los devuelve como `undefined` y `sortUndefined: "last"` los manda al
 * final en AMBAS direcciones (un `+Infinity` quedaba al final solo en
 * ascendente).
 */
const compareNumeric = (a: unknown, b: unknown) => Number(a) - Number(b);

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en borrado" llegan al menú por contexto,
 * nunca por aquí.
 */
export const getColumns = (permissions: { canEdit: boolean; canDelete: boolean }) => {
  const columns = [
    // Siempre string: el respaldo evita el `null` que excluiría la columna de
    // la búsqueda global (ver DataTable).
    columnHelper.accessor((row) => row.empleado_nombre ?? `Empleado #${row.empleado}`, {
      id: "empleado",
      header: "Empleado",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("nombre", {
      header: "Capacitación",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => row.institucion || "—", {
      id: "institucion",
      header: "Institución",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getEstadoCapacitacionLabel(row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_CAPACITACION_CFG} />
      ),
    }),
    // El accessor devuelve la fecha YA formateada para que la búsqueda global
    // encuentre lo que se ve en pantalla; el orden va sobre el ISO crudo.
    columnHelper.accessor((row) => formatLocalDate(row.fecha_inicio), {
      id: "fecha_inicio",
      header: "Inicio",
      sortingFn: (rowA, rowB) =>
        rowA.original.fecha_inicio.localeCompare(rowB.original.fecha_inicio),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => (row.fecha_fin ? formatLocalDate(row.fecha_fin) : "—"), {
      id: "fecha_fin",
      header: "Fin",
      sortingFn: (rowA, rowB) =>
        (rowA.original.fecha_fin ?? "").localeCompare(rowB.original.fecha_fin ?? ""),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    // Vacío → `undefined` para que `sortUndefined: "last"` lo deje al final en
    // ambas direcciones (precedente: `ScheduledOrderColumns`). Estas dos
    // columnas quedan FUERA de la búsqueda global de forma explícita
    // (`enableGlobalFilter: false`): con `undefined` en la primera fila TanStack
    // las excluiría igual, pero solo a veces según el orden de los datos (ver la
    // nota en `DataTable`). Buscar por horas o calificación no es un caso de uso
    // de esta vista.
    columnHelper.accessor((row) => row.horas ?? undefined, {
      id: "horas",
      header: "Horas",
      meta: { align: "right" },
      sortingFn: (rowA, rowB, columnId) =>
        compareNumeric(rowA.getValue(columnId), rowB.getValue(columnId)),
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.calificacion ?? undefined, {
      id: "calificacion",
      header: "Calificación",
      meta: { align: "right" },
      // Decimal como string ("92.50"): se compara como número.
      sortingFn: (rowA, rowB, columnId) =>
        compareNumeric(rowA.getValue(columnId), rowB.getValue(columnId)),
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {info.getValue() ?? "—"}
        </span>
      ),
    }),
    // Solo se pinta como enlace si es http(s): el backend guarda texto libre y
    // un `javascript:` en un `href` sería ejecutable.
    columnHelper.accessor((row) => row.constancia_url ?? "—", {
      id: "constancia_url",
      header: "Constancia",
      enableSorting: false,
      cell: ({ row }) => {
        const url = row.original.constancia_url;
        if (!url) {
          return <span className="text-slate-400">—</span>;
        }
        return isHttpUrl(url) ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 dark:text-sky-400 hover:underline"
            title={url}
          >
            Ver constancia
          </a>
        ) : (
          <span className="text-slate-500 dark:text-slate-400">{url}</span>
        );
      },
    }),
  ] as ColumnDef<TrainingRow>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <TrainingRowActionsMenu
            training={row.original}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<TrainingRow>
    );
  }

  return columns;
};
