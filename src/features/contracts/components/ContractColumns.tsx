import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { EditIcon, BanIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatLocalDate } from "@/src/utils/formatDate";
import { formatMxn } from "@/src/utils/formatCurrency";
import { Contract } from "../interfaces/contract.interface";
import { ESTADO_CONTRATO_CFG, TIPO_CONTRATO_OPTIONS } from "../constants/contractChoices";
import { useContractRowActionsContext } from "../hooks/useContractRowActions";
import { getContractEstadoText, getContractTipoText } from "../utils/contractRows";

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
 * Un empleado que no aparece en el catálogo (o cuyo catálogo todavía no llega)
 * se rotula `Empleado #N` (`buildContractRows`).
 */
export type ContractRow = Contract & { empleado_nombre: string };

const columnHelper = createColumnHelper<ContractRow>();

interface ContractColumnPermissions {
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * El nombre del empleado ES el menú de la fila y lleva el punto de `activo`
 * (la baja lógica del REGISTRO): sin columnas aparte de "Registro" ni
 * "Acciones". El `estado` de negocio va en su propia columna con su badge y su
 * filtro (una columna admite un solo filtro de encabezado). Los callbacks y el
 * "en vuelo" llegan por contexto; el diálogo vive en `ContractList`. Sin "Ver
 * detalle": los contratos no tienen vista de detalle.
 */
const ContractNameCell = ({
  contract,
  permissions,
}: {
  contract: ContractRow;
  permissions: ContractColumnPermissions;
}) => {
  const { onEdit, onDeactivate, busyIds } = useContractRowActionsContext();

  // El DELETE del backend es una baja lógica: sobre un contrato ya inactivo
  // sería un no-op, así que solo se ofrece sobre activos.
  const items: ActionMenuItem[] = [
    { label: "Editar", icon: EditIcon, onSelect: () => onEdit(contract), visible: permissions.canEdit },
    {
      label: "Desactivar",
      icon: BanIcon,
      onSelect: () => onDeactivate(contract),
      disabled: busyIds.includes(contract.id),
      visible: permissions.canDelete && contract.activo,
    },
  ];

  return <FolioActionMenu name={contract.empleado_nombre} items={items} active={contract.activo} />;
};

/**
 * Solo dependen de los permisos: callbacks y "en vuelo" llegan al menú por
 * `ContractRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getColumns = (permissions: ContractColumnPermissions) => {
  const columns = [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `ContractRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <ContractNameCell contract={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor((row) => getContractTipoText(row.tipo), {
      id: "tipo",
      header: "Tipo",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // "Estado" es el estado de NEGOCIO del contrato; la baja lógica del
    // registro es el punto junto al nombre. Los dos comparten el literal
    // "activo", por eso sus fichas de filtro se titulan distinto.
    columnHelper.accessor((row) => getContractEstadoText(row.estado), {
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
      meta: { align: "right" },
      sortingFn: (rowA, rowB) =>
        Number(rowA.original.salario) - Number(rowB.original.salario),
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 font-medium tabular-nums">
          {formatMxn(info.getValue())}
        </span>
      ),
    }),
  ] as ColumnDef<ContractRow>[];

  return columns;
};

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 *
 * Dos estatus, dos filtros con ficha propia: el nombre filtra por `activo` (su
 * punto), con ficha "Registro: …"; la columna Estado filtra por el `estado` de
 * negocio, con ficha "Estado: …". Tipo y estado ofrecen su catálogo completo
 * aunque ninguna fila lo use, y al final cada código desconocido de las filas,
 * crudo (igual que su celda). Las fechas filtran por mes; el fin agrupa aparte
 * los contratos sin fecha de término. El salario no lleva filtro: es un
 * importe libre, lo cubren el orden y la búsqueda.
 */
export const CONTRACT_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<ContractRow>>> = {
  empleado: { type: "boolean", filterLabel: "registro", get: (r) => r.activo, yes: "Activo", no: "Inactivo" },
  tipo: { type: "options", get: (r) => r.tipo, options: TIPO_CONTRATO_OPTIONS },
  estado: { type: "options", filterLabel: "estado", get: (r) => r.estado, options: optionsFromConfig(ESTADO_CONTRATO_CFG) },
  fecha_inicio: { type: "month", get: (r) => r.fecha_inicio },
  fecha_fin: { type: "month", get: (r) => r.fecha_fin, emptyLabel: "Sin fecha de fin" },
};
