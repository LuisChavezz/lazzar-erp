import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { Area } from "../interfaces/area.interface";
import { useAreaRowActionsContext } from "../hooks/useAreaRowActions";

/**
 * Fila de la tabla: el área tal como llega del backend más el nombre de su
 * departamento ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Si las áreas llegaban antes que el catálogo de departamentos, el
 * accessor se congelaba con el ID crudo — en pantalla, en la búsqueda global y
 * en el orden. Al construir las filas en `AreaList` a partir de áreas +
 * departamentos, la llegada del catálogo produce un `data` nuevo y TanStack
 * recalcula todo. Mismo arreglo que `EmployeeRow`.
 *
 * Un departamento que no aparece en el catálogo (o cuyo catálogo todavía no
 * llega) se rotula `Departamento #N` (`buildAreaRows`): ese mismo texto lo
 * leen la celda, la opción del filtro de encabezado y su ficha de filtro
 * activo.
 */
export type AreaRow = Area & { departamento_nombre: string };

const columnHelper = createColumnHelper<AreaRow>();

interface AreaColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre ES el menú de la fila y lleva el punto de `activo`: sin columnas
 * aparte de "Estatus" ni "Acciones". Los callbacks y el "en vuelo" llegan por
 * contexto; el diálogo vive en `AreaList`. Sin "Ver detalle": las áreas no
 * tienen vista de detalle.
 */
const AreaNameCell = ({ area, permissions }: { area: AreaRow; permissions: AreaColumnPermissions }) => {
  const { onEdit, onDeactivate, busyIds } = useAreaRowActionsContext();

  // El DELETE del backend es una baja lógica: pone `activo` en false, no borra
  // el registro. Por eso la acción se ofrece solo sobre áreas activas — sobre
  // una inactiva sería un no-op.
  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(area), visible: permissions.canEdit },
    {
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => onDeactivate(area),
      disabled: busyIds.includes(area.id),
      visible: permissions.canDelete && area.activo,
    },
  ];

  return <FolioActionMenu name={area.nombre} items={items} active={area.activo} />;
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `AreaRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: AreaColumnPermissions) => {
  const columns = [
    columnHelper.accessor("nombre", {
      header: "Nombre",
      size: 260,
      cell: ({ row }) => <AreaNameCell area={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor("codigo", {
      header: "Código",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto (o su respaldo `#N`, ver `AreaRow`).
    columnHelper.accessor((row) => row.departamento_nombre, {
      id: "departamento",
      header: "Departamento",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
  ] as ColumnDef<AreaRow>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * El nombre filtra por `activo` (su punto). El departamento compara contra el
 * FK crudo, rotulado con su nombre resuelto: dos departamentos homónimos no se
 * mezclan. El código no lleva filtro: es casi único por fila, lo cubre la
 * búsqueda.
 */
export const AREA_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<AreaRow>>> = {
  nombre: { type: "boolean", filterLabel: "estatus", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  departamento: { type: "distinct", get: (r) => r.departamento, label: (r) => r.departamento_nombre },
};
