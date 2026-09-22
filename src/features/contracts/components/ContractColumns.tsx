import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ACTIVO_INACTIVO_CFG, StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate } from "@/src/utils/formatDate";
import { formatMoneyValueOrDash } from "@/src/utils/formatCurrency";
import { Contract } from "../interfaces/contract.interface";
import {
  ESTADO_CONTRATO_CFG,
  getEstadoContratoLabel,
  getTipoContratoLabel,
} from "../constants/contractChoices";

/**
 * Fila de la tabla: el contrato tal como llega del backend más el nombre del
 * empleado ya resuelto. Es un modelo de vista, no un tipo del backend.
 *
 * El nombre viaja EN LA FILA y no se resuelve dentro del accessor con un `Map`
 * recibido por parámetro: TanStack guarda en caché el valor del accessor por
 * fila y solo lo recalcula cuando cambia `data`, no cuando cambian las
 * columnas. Como los contratos llegan antes que el catálogo de empleados, el
 * accessor se congelaba con "Empleado #N" — en pantalla, en la búsqueda global
 * y en el orden, que leen ese mismo valor. Al construir las filas en
 * `ContractList` a partir de contratos + empleados, la llegada del catálogo
 * produce un `data` nuevo y TanStack recalcula todo.
 *
 * `null` = el empleado no aparece en el catálogo (o todavía no llega).
 */
export type ContractRow = Contract & { empleado_nombre: string | null };

const columnHelper = createColumnHelper<ContractRow>();

interface ContractColumnCallbacks {
  onEdit: (contract: Contract) => void;
  onDeactivate: (contract: Contract) => void;
}

/**
 * La celda de acciones es solo presentacional: NO guarda el estado del diálogo
 * de confirmación. Ese estado vive en `ContractList`, porque una celda se
 * desmonta al ordenar, paginar o filtrar, y con ella se perdería el diálogo a
 * media interacción.
 */
export const getColumns = (
  { onEdit, onDeactivate }: ContractColumnCallbacks,
  permissions: { canEdit: boolean; canDelete: boolean },
  deactivatingId: number | null
) => {
  const columns = [
    // Un solo valor alimenta la celda, la búsqueda global y el orden, así que
    // los tres ven el nombre resuelto. Siempre es string: el respaldo evita el
    // `null` que excluiría la columna de la búsqueda (ver DataTable).
    columnHelper.accessor(
      (row) => row.empleado_nombre ?? `Empleado #${row.empleado}`,
      {
        id: "empleado",
        header: "Empleado",
        cell: (info) => (
          <span className="text-slate-600 dark:text-slate-300 font-medium">{info.getValue()}</span>
        ),
      }
    ),
    columnHelper.accessor((row) => getTipoContratoLabel(row.tipo) ?? "—", {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // "Estado" es el estado de NEGOCIO del contrato; la baja lógica va aparte
    // en "Registro". Los dos comparten el literal "activo".
    columnHelper.accessor((row) => getEstadoContratoLabel(row.estado) ?? "—", {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => (
        <StatusBadge status={row.original.estado} config={ESTADO_CONTRATO_CFG} />
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
    columnHelper.accessor("salario", {
      header: "Salario",
      sortingFn: (rowA, rowB) =>
        Number(rowA.original.salario) - Number(rowB.original.salario),
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {formatMoneyValueOrDash(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("activo", {
      header: "Registro",
      cell: (info) => (
        <StatusBadge
          status={info.getValue() ? "activo" : "inactivo"}
          config={ACTIVO_INACTIVO_CFG}
        />
      ),
    }),
  ] as ColumnDef<ContractRow>[];

  if (permissions.canEdit || permissions.canDelete) {
    columns.push(
      columnHelper.display({
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const contract = row.original;
          const menuItems: ActionMenuItem[] = [];

          if (permissions.canEdit) {
            menuItems.push({
              label: "Editar",
              icon: EditIcon,
              onSelect: () => onEdit(contract),
            });
          }
          // El DELETE del backend es una baja lógica: sobre un contrato ya
          // inactivo sería un no-op, así que solo se ofrece sobre activos.
          if (permissions.canDelete && contract.activo) {
            menuItems.push({
              label: "Desactivar",
              icon: BanIcon,
              onSelect: () => onDeactivate(contract),
              disabled: deactivatingId === contract.id,
            });
          }

          return (
            <div className="flex justify-center">
              <ActionMenu items={menuItems} ariaLabel="Acciones de contrato" />
            </div>
          );
        },
      }) as ColumnDef<ContractRow>
    );
  }

  return columns;
};
