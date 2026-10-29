import { ColumnDef, createColumnHelper, type SortingFn } from "@tanstack/react-table";
import { CheckCircleIcon, EditIcon, XIcon } from "@/src/components/Icons";
import { type ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  employeeHeaderFilter,
  estadoHeaderFilter,
  type HeaderFilterSpec,
} from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatLocalDate, formatLocalDateRange } from "@/src/utils/formatDate";
import { centsToMoney, moneyToCents } from "@/src/utils/moneyCents";
import { formatMxn } from "@/src/utils/formatCurrency";
import { formatQuincena, quincenaFromRange } from "@/src/utils/quincena";
import type { Payroll } from "../interfaces/payroll.interface";
import { ESTADO_NOMINA_CFG, ESTADO_PENDIENTE, getEstadoNominaLabel } from "../constants/payrollChoices";
import { usePayrollRowActionsContext } from "../hooks/usePayrollRowActions";

/**
 * Fila de la tabla: la nómina tal como llega del backend más los nombres de
 * sus FK y el periodo ya resueltos. Modelo de vista, no tipo del backend. Los
 * nombres viajan EN LA FILA para que un catálogo que llega tarde recalcule
 * celda, búsqueda y orden (ver `buildPayrollRows`).
 */
export type PayrollRow = Payroll & {
  empleado_nombre: string;
  sucursal_nombre: string;
  /** "1–15 de octubre de 2026", o el rango tal cual si no es una quincena exacta. */
  periodo_label: string;
};

/** Periodo legible de una nómina (las capturadas fuera de esta pantalla pueden no ser quincena). */
export const formatPayrollPeriod = (payroll: Pick<Payroll, "periodo_inicio" | "periodo_fin">) => {
  const quincena = quincenaFromRange(payroll.periodo_inicio, payroll.periodo_fin);
  return quincena
    ? formatQuincena(quincena)
    : formatLocalDateRange({
        fecha_inicio: payroll.periodo_inicio,
        fecha_fin: payroll.periodo_fin,
      });
};

/**
 * Importe de la API en pesos (`formatMxn`: la nómina se paga en moneda de curso
 * legal, LFT art. 101), o "—" si falta o no es un decimal.
 */
export const formatMoneyOrDash = (value: string | null | undefined): string => {
  const cents = moneyToCents(value);
  return cents === null ? "—" : formatMxn(centsToMoney(cents));
};

const columnHelper = createColumnHelper<PayrollRow>();

export interface PayrollColumnPermissions {
  /** Editar (`E-RH`). */
  canEdit: boolean;
  /** Marcar como pagada y cancelar (`D-RH`). */
  canPayOrCancel: boolean;
}

/** Orden por importe en centavos; un valor ausente o inválido va al final. */
const moneySort: SortingFn<PayrollRow> = (rowA, rowB, columnId) =>
  (rowA.getValue<number>(columnId) ?? 0) - (rowB.getValue<number>(columnId) ?? 0);

const centsOrUndefined = (value: string | null) => moneyToCents(value) ?? undefined;

/**
 * El nombre del empleado ES el menú de la fila ("Ver detalle" primero): sin
 * columna aparte de "Acciones". El `estado` va en su propia columna, con su
 * badge y su filtro (esquema de Contratos).
 * Acciones según el estado:
 *
 * - pendiente: editar (`E-RH`), marcar como pagada y cancelar (`D-RH`).
 * - pagada / cancelada: solo lectura; solo "Ver detalle".
 *
 * Los callbacks y el "en vuelo" llegan por contexto; los diálogos viven en
 * `PayrollList`.
 */
function PayrollNameCell({
  payroll,
  permissions,
}: {
  payroll: PayrollRow;
  permissions: PayrollColumnPermissions;
}) {
  const { onView, onEdit, onPay, onCancel, busyIds } = usePayrollRowActionsContext();
  const isBusy = busyIds.includes(payroll.id);
  const isPending = payroll.estado === ESTADO_PENDIENTE;

  const items: ActionMenuItem[] = [
    {
      label: "Editar",
      icon: EditIcon,
      onSelect: () => onEdit(payroll),
      disabled: isBusy,
      visible: isPending && permissions.canEdit,
    },
    {
      label: "Marcar como pagada",
      icon: CheckCircleIcon,
      onSelect: () => onPay(payroll),
      disabled: isBusy,
      visible: isPending && permissions.canPayOrCancel,
    },
    {
      label: "Cancelar",
      icon: XIcon,
      onSelect: () => onCancel(payroll),
      disabled: isBusy,
      visible: isPending && permissions.canPayOrCancel,
    },
  ];

  return (
    <FolioActionMenu
      name={payroll.empleado_nombre}
      detail={{ onSelect: () => onView(payroll) }}
      items={items}
    />
  );
}

/** Importe alineado a la derecha; `negative` lo pinta en rojo. */
function MoneyCell({ value, strong = false }: { value: string | null; strong?: boolean }) {
  const cents = moneyToCents(value);
  const tone =
    cents !== null && cents < 0
      ? "text-rose-600 dark:text-rose-400"
      : strong
        ? "text-slate-800 dark:text-slate-100"
        : "text-slate-600 dark:text-slate-300";
  return (
    <span className={`tabular-nums whitespace-nowrap ${strong ? "font-semibold" : ""} ${tone}`}>
      {formatMoneyOrDash(value)}
    </span>
  );
}

/**
 * Columnas de la tabla. Solo dependen de los permisos: callbacks y "en vuelo"
 * llegan al menú por contexto.
 */
export const getColumns = (permissions: PayrollColumnPermissions) =>
  [
    // Un solo valor alimenta el orden y la búsqueda global: el nombre resuelto
    // (o su respaldo `#N`, ver `PayrollRow`).
    columnHelper.accessor((row) => row.empleado_nombre, {
      id: "empleado",
      header: "Empleado",
      size: 260,
      cell: ({ row }) => <PayrollNameCell payroll={row.original} permissions={permissions} />,
    }),
    columnHelper.accessor("sucursal_nombre", {
      id: "sucursal_nombre",
      header: "Sucursal",
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400">{info.getValue()}</span>
      ),
    }),
    // Etiqueta YA formateada para la búsqueda; el orden va sobre el ISO crudo.
    columnHelper.accessor("periodo_label", {
      id: "periodo",
      header: "Periodo",
      sortingFn: (rowA, rowB) =>
        rowA.original.periodo_inicio.localeCompare(rowB.original.periodo_inicio),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => (row.fecha_pago ? formatLocalDate(row.fecha_pago) : "—"), {
      id: "fecha_pago",
      header: "Fecha de pago",
      sortingFn: (rowA, rowB) =>
        (rowA.original.fecha_pago ?? "").localeCompare(rowB.original.fecha_pago ?? ""),
      cell: (info) => (
        <span className="text-slate-500 dark:text-slate-400 whitespace-nowrap">
          {info.getValue()}
        </span>
      ),
    }),
    // Etiqueta para la búsqueda global; el código desconocido, crudo (igual que
    // su badge y su filtro).
    columnHelper.accessor((row) => getEstadoNominaLabel(row.estado) ?? row.estado, {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => <StatusBadge status={row.original.estado} config={ESTADO_NOMINA_CFG} />,
    }),
    columnHelper.accessor((row) => centsOrUndefined(row.total_percepciones), {
      id: "total_percepciones",
      header: "Percepciones",
      meta: { align: "right" },
      sortingFn: moneySort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <MoneyCell value={row.original.total_percepciones} />,
    }),
    columnHelper.accessor((row) => centsOrUndefined(row.total_deducciones), {
      id: "total_deducciones",
      header: "Deducciones",
      meta: { align: "right" },
      sortingFn: moneySort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <MoneyCell value={row.original.total_deducciones} />,
    }),
    columnHelper.accessor((row) => centsOrUndefined(row.neto), {
      id: "neto",
      header: "Neto",
      meta: { align: "right" },
      sortingFn: moneySort,
      sortUndefined: "last",
      enableGlobalFilter: false,
      cell: ({ row }) => <MoneyCell value={row.original.neto} strong />,
    }),
  ] as ColumnDef<PayrollRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`.
 * Son de cliente, sobre la quincena que ya trajo el servidor: la quincena
 * misma es un parámetro de servidor (`?quincena=`) que vive fuera de la tabla.
 *
 * El estado, con ficha "Estatus: …", ofrece el catálogo completo y al final
 * cada código desconocido, crudo. Empleado (con buscador) y sucursal comparan
 * contra el FK crudo, rotulado con el nombre resuelto de la fila (o su
 * respaldo `#N`, el mismo texto que la celda). La fecha de pago filtra por mes
 * y agrupa aparte las nóminas sin pagar. El periodo no lleva filtro (el
 * listado ya es una quincena) ni los importes (libres; los cubre el orden).
 */
export const PAYROLL_HEADER_FILTERS: Partial<Record<string, HeaderFilterSpec<PayrollRow>>> = {
  empleado: employeeHeaderFilter(),
  estado: estadoHeaderFilter(optionsFromConfig(ESTADO_NOMINA_CFG)),
  sucursal_nombre: { type: "distinct", get: (r) => r.sucursal, label: (r) => r.sucursal_nombre },
  fecha_pago: { type: "month", get: (r) => r.fecha_pago, emptyLabel: "Sin fecha de pago" },
};
