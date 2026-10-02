import { ColumnDef, createColumnHelper, type SortingFn } from "@tanstack/react-table";
import {
  CheckCircleIcon,
  DeleteIcon,
  EditIcon,
  ReopenIcon,
  ViewIcon,
} from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
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
 * que `EvaluationRow`.
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
 * Menú de acciones de UNA fila, según su estado:
 *
 * - borrador: ver detalle, editar y confirmar (`E-RH`), eliminar (`D-RH`).
 * - confirmado: solo lectura; ver detalle y devolver a borrador (`D-RH`).
 *
 * Es solo presentacional: los diálogos viven en `ProductivityList`.
 */
function ProductivityRowActionsMenu({
  record,
  permissions,
}: {
  record: Productivity;
  permissions: ProductivityColumnPermissions;
}) {
  const { onView, onEdit, onConfirm, onReopen, onDelete, busyIds } =
    useProductivityRowActionsContext();
  const isBusy = busyIds.includes(record.id);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(record) },
  ];

  if (record.estado === ESTADO_BORRADOR) {
    if (permissions.canEdit) {
      menuItems.push(
        { label: "Editar", icon: EditIcon, onSelect: () => onEdit(record), disabled: isBusy },
        {
          label: "Confirmar",
          icon: CheckCircleIcon,
          onSelect: () => onConfirm(record),
          disabled: isBusy,
        }
      );
    }
    if (permissions.canDelete) {
      menuItems.push({
        label: "Eliminar",
        icon: DeleteIcon,
        onSelect: () => onDelete(record),
        disabled: isBusy,
      });
    }
  } else if (record.estado === ESTADO_CONFIRMADO && permissions.canDelete) {
    menuItems.push({
      label: "Devolver a borrador",
      icon: ReopenIcon,
      onSelect: () => onReopen(record),
      disabled: isBusy,
    });
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones del registro" />
    </div>
  );
}

/** Nombre del empleado como disparador del detalle (mismo callback que "Ver detalle"). */
function EmployeeDetailTrigger({ row, name }: { row: ProductivityRow; name: string }) {
  const { onView } = useProductivityRowActionsContext();
  return (
    <button
      type="button"
      onClick={() => onView(row)}
      title="Ver detalle"
      className="text-left font-medium text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
    >
      {name}
    </button>
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos: callbacks y "en vuelo"
 * llegan al menú por contexto. La columna de acciones existe siempre porque
 * "Ver detalle" es para todos.
 */
export const getColumns = (permissions: ProductivityColumnPermissions) =>
  [
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
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row, getValue }) => <EmployeeDetailTrigger row={row.original} name={getValue()} />,
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
    columnHelper.accessor((row) => getEstadoProductividadLabel(row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_PRODUCTIVIDAD_CFG} />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => (
        <ProductivityRowActionsMenu record={row.original} permissions={permissions} />
      ),
    }),
  ] as ColumnDef<ProductivityRow>[];
