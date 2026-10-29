import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { formatMxn } from "@/src/utils/formatCurrency";
import { Position } from "../interfaces/position.interface";
import { usePositionRowActionsContext } from "../hooks/usePositionRowActions";

/**
 * Fila de la tabla: el puesto tal como llega del backend más el nombre de su
 * área ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si los puestos llegaban antes que el catálogo de áreas, el accessor
 * se congelaba con el ID crudo — en pantalla, en la búsqueda global y en el
 * orden. Al construir las filas en `PositionList` a partir de puestos + áreas,
 * la llegada del catálogo produce un `data` nuevo y TanStack recalcula todo.
 * Mismo arreglo que `EmployeeRow`.
 *
 * `null` = sin área asignada. Un área que no aparece en el catálogo (o cuyo
 * catálogo todavía no llega) se rotula `Área #N` (`buildPositionRows`): ese
 * mismo texto lo leen la celda, la opción del filtro y su ficha.
 */
export type PositionRow = Position & { area_nombre: string | null };

const columnHelper = createColumnHelper<PositionRow>();

interface PositionColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; el diálogo vive en `PositionList`. Sin "Ver detalle": los puestos
 * no tienen vista de detalle.
 */
const PositionNameCell = ({
  position,
  permissions,
}: {
  position: PositionRow;
  permissions: PositionColumnPermissions;
}) => {
  const { onEdit, onDeactivate, busyIds } = usePositionRowActionsContext();

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre puestos activos — sobre
  // uno inactivo sería un no-op.
  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(position), visible: permissions.canEdit },
    {
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => onDeactivate(position),
      disabled: busyIds.includes(position.id),
      visible: permissions.canDelete && position.activo,
    },
  ];

  return <FolioActionMenu name={position.nombre} items={items} active={position.activo} />;
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `PositionRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: PositionColumnPermissions) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      size: 260,
      cell: ({ row }) => <PositionNameCell position={row.original} permissions={permissions} />,
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto (o su respaldo `#N`, ver `PositionRow`).
    columnHelper.accessor((row) => row.area_nombre ?? "—", {
      id: "area",
      header: "Área",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("salario_base", {
      header: "Salario Base",
      meta: { align: "right" },
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {formatMxn(info.getValue())}
        </span>
      ),
    }),
  ] as ColumnDef<PositionRow>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto). El área compara contra el FK crudo,
 * rotulado con su nombre resuelto; los puestos sin área tienen su propia
 * opción ("Sin área", fijada primero), porque el FK es opcional. El salario no lleva filtro:
 * es un importe libre, lo cubren el orden y la búsqueda.
 */
export const POSITION_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<PositionRow>>> = {
  nombre: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  area: { type: "distinct", get: (r) => r.area, label: (r) => r.area_nombre, emptyOption: "Sin área" },
};
