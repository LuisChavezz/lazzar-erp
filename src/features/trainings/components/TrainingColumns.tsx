import { ColumnDef, createColumnHelper, sortingFns, type Row } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
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
import { Training } from "../interfaces/training.interface";
import { ESTADO_CAPACITACION_CFG } from "../constants/trainingChoices";
import { isHttpUrl } from "../schemas/training.schema";
import { useTrainingRowActionsContext } from "../hooks/useTrainingRowActions";
import { getTrainingEstadoText } from "../utils/trainingRows";

/**
 * Fila de la tabla: la capacitación tal como llega del backend más el nombre
 * del empleado ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las capacitaciones pueden llegar antes que el catálogo
 * de empleados, el accessor se congelaría con el respaldo en pantalla, en la
 * búsqueda y en el orden. Construyendo las filas en `TrainingList`
 * (`buildTrainingRows`), la llegada del catálogo produce un `data` nuevo y
 * TanStack recalcula todo. Mismo arreglo que `ContractRow`.
 *
 * `empleado_nombre` es SIEMPRE string: "Empleado #N" si el id no está en el
 * catálogo (o todavía no llega).
 */
export type TrainingRow = Training & { empleado_nombre: string };

const columnHelper = createColumnHelper<TrainingRow>();

interface TrainingColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre de la capacitación ES el menú de la fila, con el badge de su
 * `estado` debajo (regla de los catálogos): sin columnas aparte de "Estado"
 * ni "Acciones". Sin punto de `activo`: la capacitación no tiene baja lógica.
 * Los callbacks y el "en vuelo" llegan por contexto; el diálogo vive en
 * `TrainingList`. Sin "Ver detalle": las capacitaciones no tienen vista de
 * detalle.
 */
function TrainingNameCell({
  training,
  permissions,
}: {
  training: TrainingRow;
  permissions: TrainingColumnPermissions;
}) {
  const { onEdit, onDelete, busyIds } = useTrainingRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(training), visible: permissions.canEdit },
    // Borrado FÍSICO. La "cancelación" de negocio no es esto: se hace editando
    // el estado a "Cancelado".
    {
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(training),
      disabled: busyIds.includes(training.id),
      visible: permissions.canDelete,
    },
  ];

  return (
    <FolioActionMenu
      name={training.nombre}
      items={items}
      status={<StatusBadge status={training.estado} config={ESTADO_CAPACITACION_CFG} />}
    />
  );
}

/**
 * Orden numérico de un valor ya presente. Los vacíos no llegan aquí: el
 * accessor los devuelve como `undefined` y `sortUndefined: "last"` los manda al
 * final en AMBAS direcciones (un `+Infinity` quedaba al final solo en
 * ascendente).
 */
const compareNumeric = (a: unknown, b: unknown) => Number(a) - Number(b);

/** `sortingFns.alphanumeric` de TanStack aplicado a dos textos sueltos. */
const compareAlphanumericText = (a: string, b: string) =>
  sortingFns.alphanumeric(
    { getValue: () => a } as unknown as Row<TrainingRow>,
    { getValue: () => b } as unknown as Row<TrainingRow>,
    "nombre"
  );

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en vuelo" llegan al menú por contexto,
 * nunca por aquí.
 */
export const getColumns = (permissions: TrainingColumnPermissions) =>
  [
    // La búsqueda global lee el nombre MÁS la etiqueta de su estado (el badge
    // de la celda): buscar "cancelado" o "en curso" encuentra esas
    // capacitaciones, como cuando el estado tenía columna propia. El orden
    // sigue solo por el nombre (`sortingFn`) y la celda no lee este valor.
    columnHelper.accessor((row) => `${row.nombre} ${getTrainingEstadoText(row.estado)}`, {
      id: "nombre",
      header: "Capacitación",
      size: 280,
      // El mismo `alphanumeric` que TanStack elige solo para un texto, sobre
      // el nombre y no sobre el valor de búsqueda.
      sortingFn: (rowA, rowB) => compareAlphanumericText(rowA.original.nombre, rowB.original.nombre),
      cell: ({ row }) => <TrainingNameCell training={row.original} permissions={permissions} />,
    }),
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `TrainingRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => row.institucion || "—", {
      id: "institucion",
      header: "Institución",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
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

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * El nombre filtra por el `estado` (su badge), con ficha "Estatus: …": el
 * catálogo completo aunque ninguna fila lo use, y al final cada código
 * desconocido de las filas, crudo (igual que su badge). El empleado compara
 * contra el FK crudo, rotulado con el nombre resuelto, con buscador. La
 * institución agrupa primero las capacitaciones sin institución. Las fechas
 * filtran por mes; el fin agrupa aparte las que no tienen fecha de término. La
 * constancia, con o sin ella. Horas y calificación no llevan filtro: son
 * números libres, los cubre el orden.
 */
export const TRAINING_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<TrainingRow>>> = {
  nombre: estadoHeaderFilter(optionsFromConfig(ESTADO_CAPACITACION_CFG)),
  empleado: employeeHeaderFilter(),
  institucion: { type: "distinct", get: (r) => r.institucion, emptyOption: "Sin institución" },
  fecha_inicio: { type: "month", get: (r) => r.fecha_inicio },
  fecha_fin: { type: "month", get: (r) => r.fecha_fin, emptyLabel: "Sin fecha de fin" },
  constancia_url: {
    type: "presence",
    get: (r) => r.constancia_url,
    con: "Con constancia",
    sin: "Sin constancia",
  },
};
