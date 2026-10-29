import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { BanIcon, CheckCircleIcon, EditIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { formatLocalDate } from "@/src/utils/formatDate";
import { Employee } from "../interfaces/employee.interface";
import { getEmployeeFullName } from "../utils/employeeName";
import { useEmployeeRowActionsContext } from "../hooks/useEmployeeRowActions";

/**
 * Fila de la tabla: el empleado tal como llega del backend más los nombres de
 * su puesto, su departamento y su sucursal ya resueltos. Es un modelo de
 * vista, no un tipo del backend.
 *
 * Esos nombres viajan EN LA FILA y no se resuelven dentro del accessor con un
 * `Map` recibido por parámetro: TanStack guarda en caché el valor del accessor
 * por fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si los empleados llegaban antes que el catálogo de puestos o de
 * departamentos, el accessor se congelaba con el ID crudo — en pantalla, en la
 * búsqueda global y en el orden. Al construir las filas en `EmployeeList` a
 * partir de empleados + catálogos, la llegada de cada catálogo produce un
 * `data` nuevo y TanStack recalcula todo. Mismo arreglo que `ContractRow` y
 * `CalendarRow`. La sucursal también va en la fila: el filtro de encabezado
 * rotula sus opciones con ella.
 *
 * `null` = el FK no aparece en su catálogo (o el catálogo todavía no llega).
 */
export type EmployeeRow = Employee & {
  puesto_nombre: string | null;
  departamento_nombre: string | null;
  sucursal_nombre: string | null;
};

const columnHelper = createColumnHelper<EmployeeRow>();

interface EmployeeColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre ES el menú de la fila ("Ver detalle" primero) y lleva el punto de
 * `activo`: sin columnas aparte de "Estatus" ni "Acciones". Los callbacks y el
 * "en vuelo" llegan por contexto; los diálogos viven en `EmployeeList`.
 */
const EmployeeNameCell = ({
  employee,
  permissions,
}: {
  employee: EmployeeRow;
  permissions: EmployeeColumnPermissions;
}) => {
  const { onView, onEdit, onDeactivate, onReactivate, busyIds } = useEmployeeRowActionsContext();
  const isBusy = busyIds.includes(employee.id);

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Reactivar es la dirección contraria del mismo cambio, comparte
  // permiso (D-RH) y se excluyen entre sí: una fila ofrece una o la otra.
  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(employee), visible: permissions.canEdit },
    {
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => onDeactivate(employee),
      disabled: isBusy,
      visible: permissions.canDelete && employee.activo,
    },
    {
      label: "Reactivar",
      icon: CheckCircleIcon,
      onSelect: () => onReactivate(employee),
      disabled: isBusy,
      visible: permissions.canDelete && !employee.activo,
    },
  ];

  return (
    <FolioActionMenu
      name={getEmployeeFullName(employee)}
      detail={{ href: `/hr/employees/${employee.id}`, onSelect: () => onView(employee) }}
      items={items}
      active={employee.activo}
    />
  );
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `EmployeeRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: EmployeeColumnPermissions) => {
  const columns = [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre completo.
    columnHelper.accessor((row) => getEmployeeFullName(row), {
      id: "nombre_completo",
      header: "Nombre",
      size: 260,
      cell: ({ row }) => <EmployeeNameCell employee={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor("numero_empleado", {
      header: "No. Empleado",
      cell: (info) => (
        <span className="font-mono text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto. Siempre es string: el respaldo evita el
    // `null` que excluiría la columna de la búsqueda (ver DataTable).
    columnHelper.accessor((row) => row.puesto_nombre ?? String(row.puesto), {
      id: "puesto",
      header: "Puesto",
      cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.departamento_nombre ?? String(row.departamento), {
      id: "departamento",
      header: "Departamento",
      cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.sucursal_nombre ?? String(row.sucursal), {
      id: "sucursal",
      header: "Sucursal",
      cell: (info) => <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>,
    }),
    columnHelper.accessor("fecha_ingreso", {
      header: "Ingreso",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
  ] as ColumnDef<EmployeeRow>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Las opciones salen del listado completo (la tabla es de modo cliente) y
 * comparan contra el FK crudo, rotulado con su nombre resuelto: dos puestos
 * homónimos no se mezclan. El nombre filtra por `activo` (su punto). El número
 * de empleado no lleva filtro: es único por fila, lo cubre la búsqueda.
 */
export const EMPLOYEE_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<EmployeeRow>>> = {
  nombre_completo: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  puesto: { type: "distinct", get: (r) => r.puesto, label: (r) => r.puesto_nombre ?? `Puesto #${r.puesto}` },
  departamento: {
    type: "distinct",
    get: (r) => r.departamento,
    label: (r) => r.departamento_nombre ?? `Departamento #${r.departamento}`,
  },
  sucursal: { type: "distinct", get: (r) => r.sucursal, label: (r) => r.sucursal_nombre ?? `Sucursal #${r.sucursal}` },
  fecha_ingreso: { type: "month", get: (r) => r.fecha_ingreso },
};
