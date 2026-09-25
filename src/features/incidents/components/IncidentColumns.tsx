import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BanIcon, CheckCircleIcon, EditIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate, formatShortDate, formatShortTime } from "@/src/utils/formatDate";
import { Incident } from "../interfaces/incident.interface";
import {
  ESTADO_INCIDENCIA_CFG,
  GRAVEDAD_INCIDENCIA_CFG,
  TIPO_INCIDENCIA_CFG,
  getEstadoIncidenciaLabel,
  getGravedadIncidenciaLabel,
  getTipoIncidenciaLabel,
  gravedadIncidenciaRank,
} from "../constants/incidentChoices";
import {
  useIncidentRowActionsContext,
  usePendingIncidentToggleIds,
} from "../hooks/useIncidentRowActions";

/**
 * Fila de la tabla: la incidencia tal como llega del backend más los nombres
 * de sus dos FK ya resueltos. Es un modelo de vista, no un tipo del backend.
 *
 * Los nombres viajan EN LA FILA y no se resuelven dentro del accessor: TanStack
 * guarda en caché el valor del accessor por fila y solo lo recalcula cuando
 * cambia `data`. Como las incidencias pueden llegar antes que los catálogos de
 * empleados y usuarios, el accessor se congelaría con el respaldo en pantalla,
 * en la búsqueda y en el orden. Construyendo las filas en `IncidentList`, la
 * llegada de cada catálogo produce un `data` nuevo y TanStack recalcula todo.
 * Mismo arreglo que `TrainingRow`.
 *
 * - `empleado_nombre`: `null` = el empleado no aparece en el catálogo (o
 *   todavía no llega); la celda cae a "Empleado #N".
 * - `reportado_por_nombre`: SIEMPRE string, ya con su respaldo ("…" mientras
 *   carga el catálogo, "Usuario #N" si el id no se resuelve o el catálogo
 *   falló, "—" si es `null`), para que la columna nunca quede fuera de la
 *   búsqueda global. Ver `getReporterName` en `IncidentList`.
 */
export type IncidentRow = Incident & {
  empleado_nombre: string | null;
  reportado_por_nombre: string;
};

const columnHelper = createColumnHelper<IncidentRow>();

/**
 * Menú de acciones de UNA fila. Lee los callbacks por contexto y el "en vuelo"
 * de la `MutationCache` (ver `useIncidentRowActions`), así que un cambio de
 * estatus en curso solo re-renderiza este componente y no remonta las celdas.
 *
 * Es solo presentacional: el diálogo de confirmación vive en `IncidentList`,
 * porque una celda se desmonta al ordenar, paginar o filtrar —y dar de baja
 * cambia `activo`, que es justo el filtro "Estatus"—.
 */
function IncidentRowActionsMenu({
  incident,
  canEdit,
  canDelete,
}: {
  incident: Incident;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const { onEdit, onToggleActivo } = useIncidentRowActionsContext();
  const togglingIds = usePendingIncidentToggleIds();
  const menuItems: ActionMenuItem[] = [];

  // Editar se ofrece también sobre incidencias dadas de baja, igual que en
  // centros de costo: la baja es un estatus, no un bloqueo del registro.
  if (canEdit) {
    menuItems.push({
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(incident),
    });
  }
  // Una sola acción que recorre el ciclo de vida en los dos sentidos: la
  // etiqueta sigue al estatus de la fila. Ambos sentidos exigen D-RH.
  if (canDelete) {
    menuItems.push({
      label: incident.activo ? "Dar de baja" : "Reactivar",
      icon: incident.activo ? BanIcon : CheckCircleIcon,
      onSelect: () => onToggleActivo(incident),
      disabled: togglingIds.includes(incident.id),
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de incidencia" />
    </div>
  );
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
    // Siempre string: el respaldo evita el `null` que excluiría la columna de
    // la búsqueda global (ver DataTable).
    columnHelper.accessor((row) => row.empleado_nombre ?? `Empleado #${row.empleado}`, {
      id: "empleado",
      header: "Empleado",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => getTipoIncidenciaLabel(row.tipo) ?? "—", {
      id: "tipo",
      header: "Tipo",
      cell: ({ row }) => <StatusBadge status={row.original.tipo} config={TIPO_INCIDENCIA_CFG} />,
    }),
    columnHelper.accessor((row) => getGravedadIncidenciaLabel(row.gravedad) ?? "—", {
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
    columnHelper.accessor((row) => getEstadoIncidenciaLabel(row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_INCIDENCIA_CFG} />
      ),
    }),
    // Texto libre largo: buscable (siempre string), pero SIN orden —ordenar
    // alfabéticamente una descripción no significa nada—, así que no hay vacíos
    // que mandar al final.
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
    columnHelper.accessor("activo", {
      header: "Estatus",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
  ] as ColumnDef<IncidentRow>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        meta: { align: "center" },
        cell: ({ row }) => (
          <IncidentRowActionsMenu
            incident={row.original}
            canEdit={permissions.canEdit}
            canDelete={permissions.canDelete}
          />
        ),
      }) as ColumnDef<IncidentRow>
    );
  }

  return columns;
};
