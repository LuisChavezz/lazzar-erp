import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BanIcon, CheckCircleIcon, EditIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatLocalDate, formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { Incident } from "../interfaces/incident.interface";
import {
  ESTADO_INCIDENCIA_CFG,
  GRAVEDAD_INCIDENCIA_CFG,
  TIPO_INCIDENCIA_CFG,
  gravedadIncidenciaRank,
} from "../constants/incidentChoices";
import { useIncidentRowActionsContext } from "../hooks/useIncidentRowActions";
import {
  getIncidentEstadoText,
  getIncidentGravedadText,
  getIncidentTipoText,
} from "../utils/incidentRows";

/**
 * Fila de la tabla: la incidencia tal como llega del backend más los nombres
 * de sus dos FK ya resueltos. Es un modelo de vista, no un tipo del backend.
 *
 * Los nombres viajan EN LA FILA y no se resuelven dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las incidencias pueden llegar antes que los catálogos de
 * empleados y usuarios, el accessor se congelaría con el respaldo en pantalla,
 * en la búsqueda y en el orden. Construyendo las filas en `IncidentList`
 * (`buildIncidentRows`), la llegada de cada catálogo produce un `data` nuevo y
 * TanStack recalcula todo. Mismo arreglo que `ContractRow`.
 *
 * Los dos son SIEMPRE string, ya con su respaldo, para que ninguna columna
 * quede fuera de la búsqueda global:
 * - `empleado_nombre`: "Empleado #N" si el id no está en el catálogo.
 * - `reportado_por_nombre`: "…" mientras carga el catálogo, "Usuario #N" si el
 *   id no se resuelve o el catálogo falló, "—" si es `null` (ver
 *   `resolveUserName`).
 */
export type IncidentRow = Incident & {
  empleado_nombre: string;
  reportado_por_nombre: string;
};

const columnHelper = createColumnHelper<IncidentRow>();

interface IncidentColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre del empleado ES el menú de la fila y lleva el punto de `activo`
 * (la baja lógica del REGISTRO): sin columnas aparte de "Estatus" ni
 * "Acciones". El `estado` de negocio (abierto/cerrado) va en su propia
 * columna con su badge y su filtro (esquema de Contratos). Los callbacks y el
 * "en vuelo" llegan por contexto; el diálogo vive en `IncidentList`. Sin "Ver
 * detalle": las incidencias no tienen vista de detalle.
 */
function IncidentNameCell({
  incident,
  permissions,
}: {
  incident: IncidentRow;
  permissions: IncidentColumnPermissions;
}) {
  const { onEdit, onToggleActivo, busyIds } = useIncidentRowActionsContext();

  const items: ActionMenuItem[] = [
    // Editar se ofrece también sobre incidencias dadas de baja: la baja es un
    // estatus del registro, no un bloqueo.
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(incident), visible: permissions.canEdit },
    // Una sola acción que recorre el ciclo de vida en los dos sentidos: la
    // etiqueta sigue al registro de la fila. Ambos sentidos exigen D-RH.
    {
      label: incident.activo ? "Dar de baja" : "Reactivar",
      icon: incident.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(incident),
      disabled: busyIds.includes(incident.id),
      visible: permissions.canDelete,
    },
  ];

  return <FolioActionMenu name={incident.empleado_nombre} items={items} active={incident.activo} />;
}

/** Texto largo en una línea: se recorta y el completo va en el `title`. */
const LongTextCell = ({ value }: { value: string }) =>
  value === "—" ? (
    <span className="text-slate-400">—</span>
  ) : (
    <span
      className="block max-w-64 truncate text-slate-500 dark:text-slate-400"
      title={value}
    >
      {value}
    </span>
  );

/**
 * Columnas de la tabla. Solo dependen de los permisos (estables durante la
 * sesión): los callbacks y el estado "en vuelo" llegan al menú por contexto,
 * nunca por aquí.
 */
export const getColumns = (permissions: IncidentColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `IncidentRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <IncidentNameCell incident={row.original} permissions={permissions} />,
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
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su badge y su opción de filtro).
    columnHelper.accessor((row) => getIncidentTipoText(row.tipo), {
      id: "tipo",
      header: "Tipo",
      cell: ({ row }) => <StatusBadge status={row.original.tipo} config={TIPO_INCIDENCIA_CFG} />,
    }),
    columnHelper.accessor((row) => getIncidentGravedadText(row.gravedad), {
      id: "gravedad",
      header: "Gravedad",
      // Por severidad real (baja < media < alta), no alfabético sobre la
      // etiqueta, que ordenaría Alta → Baja → Media. Mismo criterio que la
      // prioridad de picking.
      sortingFn: (rowA, rowB) =>
        gravedadIncidenciaRank(rowA.original.gravedad) -
        gravedadIncidenciaRank(rowB.original.gravedad),
      cell: ({ row }) => (
        <StatusBadge status={row.original.gravedad} config={GRAVEDAD_INCIDENCIA_CFG} />
      ),
    }),
    // "Estado" es el estado de NEGOCIO (abierto/cerrado); la baja lógica del
    // registro es el punto junto al nombre.
    columnHelper.accessor((row) => getIncidentEstadoText(row.estado), {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_INCIDENCIA_CFG} />
      ),
    }),
    // Texto libre largo: buscable (siempre string), pero SIN orden —ordenar
    // alfabéticamente una descripción no significa nada—.
    columnHelper.accessor((row) => row.descripcion || "—", {
      id: "descripcion",
      header: "Descripción",
      enableSorting: false,
      cell: (info) => <LongTextCell value={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.acciones_tomadas || "—", {
      id: "acciones_tomadas",
      header: "Acciones Tomadas",
      enableSorting: false,
      cell: (info) => <LongTextCell value={info.getValue()} />,
    }),
    columnHelper.accessor("reportado_por_nombre", {
      id: "reportado_por",
      header: "Reportado por",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Timestamp real con offset: fecha y hora en la zona LOCAL del navegador
    // (sin `timeZone: "UTC"`, que es solo para fechas-calendario). El orden va
    // sobre el instante, no sobre el texto.
    columnHelper.accessor(
      (row) => `${formatShortDate(row.fecha_reporte)} ${formatShortTime(row.fecha_reporte)}`,
      {
        id: "fecha_reporte",
        header: "Reportada",
        sortingFn: (rowA, rowB) =>
          new Date(rowA.original.fecha_reporte).getTime() -
          new Date(rowB.original.fecha_reporte).getTime(),
        cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {formatShortDate(row.original.fecha_reporte)}
            <span className="ml-1.5 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {formatShortTime(row.original.fecha_reporte)}
            </span>
          </span>
        ),
      }
    ),
  ] as ColumnDef<IncidentRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * Dos estatus, dos filtros con ficha propia (esquema de Contratos): el nombre
 * filtra por `activo` (su punto), con ficha "Registro: …"; la columna Estado
 * filtra por el `estado` de negocio, con ficha "Estado: …". Tipo, gravedad y
 * estado ofrecen su catálogo completo (con el punto de su badge) aunque
 * ninguna fila lo use, y al final cada código desconocido de las filas, crudo
 * (igual que su celda). El reportante compara contra el FK crudo, rotulado con
 * su nombre resuelto, y agrupa aparte las incidencias sin reportante. Las
 * fechas filtran por mes. Descripción y acciones no llevan filtro: son texto
 * libre, lo cubre la búsqueda.
 */
export const INCIDENT_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<IncidentRow>>> = {
  empleado: { type: "boolean", filterLabel: "registro", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  fecha: { type: "month", get: (r) => r.fecha },
  tipo: { type: "options", get: (r) => r.tipo, options: optionsFromConfig(TIPO_INCIDENCIA_CFG) },
  gravedad: { type: "options", get: (r) => r.gravedad, options: optionsFromConfig(GRAVEDAD_INCIDENCIA_CFG) },
  estado: { type: "options", get: (r) => r.estado, options: optionsFromConfig(ESTADO_INCIDENCIA_CFG) },
  reportado_por: {
    type: "distinct",
    get: (r) => r.reportado_por,
    label: (r) => r.reportado_por_nombre,
    emptyOption: "Sin reportante",
  },
  fecha_reporte: { type: "month", get: (r) => r.fecha_reporte },
};
