import { ColumnDef, createColumnHelper, type SortingFn } from "@tanstack/react-table";
import { CheckCircleIcon, DeleteIcon, EditIcon, ReopenIcon } from "@/src/components/Icons";
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
import { formatQuantityValue } from "@/src/utils/formatCurrency";
import { Productivity } from "../interfaces/productivity.interface";
import {
  ESTADO_BORRADOR,
  ESTADO_CONFIRMADO,
  ESTADO_PRODUCTIVIDAD_CFG,
  getEstadoProductividadLabel,
} from "../constants/productivityChoices";
import { formatCumplimiento } from "../utils/compliance";
import { useProductivityRowActionsContext } from "../hooks/useProductivityRowActions";

/**
 * Fila de la tabla: el registro tal como llega del backend más los nombres de
 * sus FK y el cumplimiento ya resueltos. Es un modelo de vista, no un tipo del
 * backend. Los nombres viajan EN LA FILA (no en el accessor) para que un
 * catálogo que llega tarde recalcule celda, búsqueda y orden. Mismo arreglo
 * que `ContractRow` (ver `buildProductivityRows`).
 */
export type ProductivityRow = Productivity & {
  empleado_nombre: string;
  departamento_nombre: string;
  unidad_nombre: string;
  /** `resultado / meta × 100`, o `null` (ver `getCumplimiento`). */
  cumplimiento: number | null;
};

const columnHelper = createColumnHelper<ProductivityRow>();

export interface ProductivityColumnPermissions {
  /** Editar y confirmar (`E-RH`). */
  canEdit: boolean;
  /** Eliminar y devolver a borrador (`D-RH`). */
  canDelete: boolean;
}

/** Decimal opcional: "—" si viene `null`; si no, número es-MX hasta 2 decimales. */
const formatDecimalOrDash = (value: string | null) =>
  value === null ? "—" : formatQuantityValue(value);

/** Orden numérico de una columna cuyo valor puede faltar (`undefined` → al final). */
const numericSort: SortingFn<ProductivityRow> = (rowA, rowB, columnId) =>
  Number(rowA.getValue(columnId)) - Number(rowB.getValue(columnId));

/**
 * El nombre del empleado ES el menú de la fila ("Ver detalle" primero): sin
 * columna aparte de "Acciones". El `estado` va en su propia columna, con su
 * badge y su filtro (esquema de Contratos).
 * Acciones según el estado:
 *
 * - borrador: editar y confirmar (`E-RH`), eliminar (`D-RH`).
 * - confirmado: solo lectura; devolver a borrador (`D-RH`).
 *
 * Los callbacks y el "en vuelo" llegan por contexto; los diálogos viven en
 * `ProductivityList`.
 */
function ProductivityNameCell({
  record,
  permissions,
}: {
  record: ProductivityRow;
  permissions: ProductivityColumnPermissions;
}) {
  const { onView, onEdit, onConfirm, onReopen, onDelete, busyIds } =
    useProductivityRowActionsContext();
  const isBusy = busyIds.includes(record.id);
  const isBorrador = record.estado === ESTADO_BORRADOR;

  const items: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(record),
      disabled: isBusy,
      visible: isBorrador && permissions.canEdit,
    },
    {
      label: "Confirmar",
      icon: CheckCircleIcon,
      onSelect: () => onConfirm(record),
      disabled: isBusy,
      visible: isBorrador && permissions.canEdit,
    },
    {
      label: "Eliminar",
      icon: DeleteIcon,
      onSelect: () => onDelete(record),
      disabled: isBusy,
      visible: isBorrador && permissions.canDelete,
    },
    {
      label: "Devolver a borrador",
      icon: ReopenIcon,
      onSelect: () => onReopen(record),
      disabled: isBusy,
      visible: record.estado === ESTADO_CONFIRMADO && permissions.canDelete,
    },
  ];

  return (
    <FolioActionMenu
      name={record.empleado_nombre}
      detail={{ onSelect: () => onView(record) }}
      items={items}
    />
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos: callbacks y "en vuelo"
 * llegan al menú por contexto.
 */
export const getColumns = (permissions: ProductivityColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `ProductivityRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <ProductivityNameCell record={row.original} permissions={permissions} />,
    }),
    // Fecha YA formateada para la búsqueda; el orden va sobre el ISO crudo.
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
    columnHelper.accessor("departamento_nombre", {
      id: "departamento_nombre",
      header: "Departamento",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Texto libre: buscable (siempre string), sin orden.
    columnHelper.accessor((row) => row.descripcion?.trim() || "—", {
      id: "descripcion",
      header: "Descripción",
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
    // Decimales opcionales: vacío → `undefined` para que `sortUndefined:
    // "last"` lo deje al final en ambas direcciones; fuera de la búsqueda
    // global, mismo trato que el puntaje de evaluaciones.
    columnHelper.accessor((row) => row.meta ?? undefined, {
      id: "meta",
      header: "Meta",
      meta: { align: "right" },
      sortingFn: numericSort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatDecimalOrDash(row.original.meta)}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.resultado ?? undefined, {
      id: "resultado",
      header: "Resultado",
      meta: { align: "right" },
      sortingFn: numericSort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {formatDecimalOrDash(row.original.resultado)}
        </span>
      ),
    }),
    columnHelper.accessor("unidad_nombre", {
      id: "unidad_nombre",
      header: "Unidad",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => row.cumplimiento ?? undefined, {
      id: "cumplimiento",
      header: "Cumplimiento",
      meta: { align: "right" },
      sortingFn: numericSort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => (
        <span className="text-slate-700 dark:text-slate-200 font-medium tabular-nums whitespace-nowrap">
          {formatCumplimiento(row.original.cumplimiento)}
        </span>
      ),
    }),
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su badge y su filtro).
    columnHelper.accessor((row) => getEstadoProductividadLabel(row.estado) ?? row.estado, {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_PRODUCTIVIDAD_CFG} />
      ),
    }),
  ] as ColumnDef<ProductivityRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * El estado, con ficha "Estatus: …", ofrece el catálogo completo y al final
 * cada código desconocido, crudo. Empleado (con buscador), departamento y
 * unidad comparan contra el FK crudo, rotulado con el nombre resuelto de la
 * fila (o su respaldo `#N`, el mismo texto que la celda): sus opciones salen
 * de las filas. La fecha filtra por mes. Descripción, meta, resultado y
 * cumplimiento no llevan filtro: son libres, los cubren el orden y la
 * búsqueda.
 */
export const PRODUCTIVITY_HEADER_FILTERS: Partial<
  Record<string, HeaderFilterSpec<ProductivityRow>>
> = {
  empleado: employeeHeaderFilter(),
  estado: estadoHeaderFilter(optionsFromConfig(ESTADO_PRODUCTIVIDAD_CFG)),
  fecha: { type: "month", get: (r) => r.fecha },
  departamento_nombre: {
    type: "distinct",
    get: (r) => r.departamento,
    label: (r) => r.departamento_nombre,
  },
  unidad_nombre: { type: "distinct", get: (r) => r.meta_unidad, label: (r) => r.unidad_nombre },
};
