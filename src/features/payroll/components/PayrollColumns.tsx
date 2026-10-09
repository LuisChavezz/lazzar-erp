import { ColumnDef, createColumnHelper, type SortingFn } from "@tanstack/react-table";
import { CheckCircleIcon, EditIcon, ViewIcon, XIcon } from "@/src/components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatLocalDate, formatLocalDateRange } from "@/src/utils/formatDate";
import { formatCents, moneyToCents } from "@/src/utils/moneyCents";
import { formatQuincena, quincenaFromRange } from "@/src/utils/quincena";
import type { Payroll } from "../interfaces/payroll.interface";
import {
  ESTADO_NOMINA_CFG,
  ESTADO_PENDIENTE,
  getEstadoNominaLabel,
} from "../constants/payrollChoices";
import { usePayrollRowActionsContext } from "../hooks/usePayrollRowActions";

/**
 * Fila de la tabla: la nómina tal como llega del backend más los nombres de
 * sus FK y el periodo ya resueltos. Modelo de vista, no tipo del backend. Los
 * nombres viajan EN LA FILA para que un catálogo que llega tarde recalcule
 * celda, búsqueda y orden.
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

/** Importe de la API en pesos, o "—" si falta o no es un decimal. */
export const formatMoneyOrDash = (value: string | null | undefined): string => {
  const cents = moneyToCents(value);
  return cents === null ? "—" : formatCents(cents);
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
 * Menú de acciones de UNA fila, según su estado:
 *
 * - pendiente: ver detalle, editar (`E-RH`), marcar como pagada y cancelar (`D-RH`).
 * - pagada / cancelada: solo lectura; solo "Ver detalle".
 *
 * Es solo presentacional: los diálogos viven en `PayrollList`.
 */
function PayrollRowActionsMenu({
  payroll,
  permissions,
}: {
  payroll: Payroll;
  permissions: PayrollColumnPermissions;
}) {
  const { onView, onEdit, onPay, onCancel, busyIds } = usePayrollRowActionsContext();
  const isBusy = busyIds.includes(payroll.id);

  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onView(payroll) },
  ];

  if (payroll.estado === ESTADO_PENDIENTE) {
    if (permissions.canEdit) {
      menuItems.push({
        label: "Editar",
        icon: EditIcon,
        onSelect: () => onEdit(payroll),
        disabled: isBusy,
      });
    }
    if (permissions.canPayOrCancel) {
      menuItems.push(
        {
          label: "Marcar como pagada",
          icon: CheckCircleIcon,
          onSelect: () => onPay(payroll),
          disabled: isBusy,
        },
        {
          label: "Cancelar",
          icon: XIcon,
          onSelect: () => onCancel(payroll),
          disabled: isBusy,
        }
      );
    }
  }

  return (
    <div className="flex justify-center">
      <ActionMenu items={menuItems} ariaLabel="Acciones de la nómina" />
    </div>
  );
}

/** Nombre del empleado como disparador del detalle (mismo callback que "Ver detalle"). */
function EmployeeDetailTrigger({ row, name }: { row: PayrollRow; name: string }) {
  const { onView } = usePayrollRowActionsContext();
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
 * llegan al menú por contexto. La columna de acciones existe siempre porque
 * "Ver detalle" es para todos.
 */
export const getColumns = (permissions: PayrollColumnPermissions) =>
  [
    columnHelper.accessor("empleado_nombre", {
      id: "empleado_nombre",
      header: "Empleado",
      cell: ({ row, getValue }) => <EmployeeDetailTrigger row={row.original} name={getValue()} />,
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
    columnHelper.accessor((row) => getEstadoNominaLabel(row.estado) ?? "—", {
      id: "estado_label",
      header: "Estado",
      meta: { align: "center" },
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusBadge status={row.original.estado} config={ESTADO_NOMINA_CFG} />
        </div>
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: "Acciones",
      meta: { align: "center" },
      cell: ({ row }) => <PayrollRowActionsMenu payroll={row.original} permissions={permissions} />,
    }),
  ] as ColumnDef<PayrollRow>[];
