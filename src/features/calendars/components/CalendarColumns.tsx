import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, DeleteIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Calendar } from "../interfaces/calendar.interface";
import { useCalendarRowActionsContext } from "../hooks/useCalendarRowActions";
import {
  CALENDAR_TIPO_FILTER_OPTIONS,
  getCalendarTipoText,
  SIN_TIPO_LABEL,
} from "../utils/calendarRows";

/**
 * Fila de la tabla: el día tal como llega del backend más el nombre del turno
 * ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si los días llegaban antes que el catálogo de turnos, el accessor
 * se congelaba con el ID crudo — en pantalla, en la búsqueda global y en el
 * orden, que leen ese mismo valor. Al construir las filas en `CalendarList` a
 * partir de días + turnos, la llegada del catálogo produce un `data` nuevo y
 * TanStack recalcula todo. Mismo arreglo que `EmployeeRow`.
 *
 * Un turno que no aparece en el catálogo (o cuyo catálogo todavía no llega) se
 * rotula `Turno #N` (`buildCalendarRows`): ese mismo texto lo leen la celda, la
 * opción del filtro y su ficha.
 */
export type CalendarRow = Calendar & { turno_nombre: string };

const columnHelper = createColumnHelper<CalendarRow>();

interface CalendarColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Un día de calendario no tiene nombre: su fecha ES el menú de la fila, sin
 * columna aparte de "Acciones". Tampoco lleva punto: `Calendario` no tiene
 * `activo`. Los callbacks y el "en vuelo" llegan por contexto; el diálogo vive
 * en `CalendarList`. Sin "Ver detalle": no hay vista de detalle.
 */
const CalendarDateCell = ({
  calendar,
  permissions,
}: {
  calendar: CalendarRow;
  permissions: CalendarColumnPermissions;
}) => {
  const { onEdit, onDelete, busyIds } = useCalendarRowActionsContext();

  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(calendar), visible: permissions.canEdit },
    // "Eliminar", no "Desactivar": aquí el DELETE borra la fila de verdad,
    // porque `Calendario` no tiene `activo`.
    {
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(calendar),
      disabled: busyIds.includes(calendar.id),
      visible: permissions.canDelete,
    },
  ];

  return <FolioActionMenu name={formatLocalDate(calendar.fecha)} items={items} />;
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `CalendarRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: CalendarColumnPermissions) => {
  const columns = [
    // El accessor devuelve la fecha YA formateada, no el ISO crudo: la búsqueda
    // global de DataTable lee el valor del accessor, así que teclear la fecha
    // tal como se ve en pantalla ("15/01/2026") tiene que encontrarla.
    columnHelper.accessor((row) => formatLocalDate(row.fecha), {
      id: "fecha",
      header: "Fecha",
      // El orden va sobre el ISO crudo: ordenar "15/01/2026" como texto pondría
      // los días antes que los meses.
      sortingFn: (rowA, rowB) => rowA.original.fecha.localeCompare(rowB.original.fecha),
      cell: ({ row }) => <CalendarDateCell calendar={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor((row) => getCalendarTipoText(row.tipo), {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto (o su respaldo `#N`, ver `CalendarRow`).
    columnHelper.accessor((row) => row.turno_nombre, {
      id: "turno",
      header: "Turno",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Sin estatus: `Calendario` no tiene `activo`.
  ] as ColumnDef<CalendarRow>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * La fecha filtra por mes. El tipo ofrece "Sin tipo" fijado primero, luego el
 * catálogo completo aunque ninguna fila lo use, y al final cada código
 * desconocido de las filas, crudo. El turno compara contra el FK crudo, rotulado con su nombre
 * resuelto.
 */
export const CALENDAR_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<CalendarRow>>> = {
  fecha: { type: "month", get: (r) => r.fecha },
  tipo: { type: "options", get: (r) => r.tipo, options: CALENDAR_TIPO_FILTER_OPTIONS, emptyOption: SIN_TIPO_LABEL },
  turno: { type: "distinct", get: (r) => r.turno, label: (r) => r.turno_nombre },
};
