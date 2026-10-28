"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon } from "@/src/components/Icons";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import { CXC_ESTATUS_CONFIG } from "../constants/cxcEstatus";
import type {
  CuentaPorCobrarRow,
  CxCEstatus,
} from "../interfaces/accounts-receivable.interface";

// ── Badge de estatus ──────────────────────────────────────────────────────────
// La config vive en `constants/cxcEstatus.ts` porque el diálogo de detalle
// también la usa.

const EstatusBadge = ({ estatus }: { estatus: CxCEstatus }) => (
  <StatusBadge status={estatus} config={CXC_ESTATUS_CONFIG} />
);

// ── Acciones de fila ──────────────────────────────────────────────────────────

interface AccountsReceivableColumnsCallbacks {
  /** Abre el detalle de la cuenta. El diálogo vive en `AccountsReceivableList`. */
  onViewDetail: (id: number) => void;
}

const ActionsCell = ({
  row,
  onViewDetail,
}: { row: CuentaPorCobrarRow } & AccountsReceivableColumnsCallbacks) => {
  // "Registrar cobro" y "Ver factura" vivían aquí con `onSelect: () => {}`: se
  // ofrecían al usuario y no hacían nada. Se retiran hasta que exista la
  // funcionalidad — un menú que miente es peor que uno corto. Al reponerlas,
  // "Registrar cobro" solo aplica con saldo pendiente (estatus distinto de
  // "Pagada" y "Cancelada") y necesitará su código de permiso.
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => onViewDetail(row.id) },
  ];

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio_cxc}`} />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<CuentaPorCobrarRow>();

/**
 * Columnas del listado de CxC. El diálogo de detalle NO vive en una celda (las
 * celdas se desmontan al ordenar, paginar o filtrar): `onViewDetail` lo abre en
 * `AccountsReceivableList`.
 */
export const getAccountsReceivableColumns = ({ onViewDetail }: AccountsReceivableColumnsCallbacks) => [
  columnHelper.accessor("folio_cxc", {
    header: "Folio CxC",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("cliente_nombre", {
    header: "Cliente",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("factura_folio", {
    header: "Factura",
    cell: (info) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {textOrDash(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_emision", {
    header: "Emisión",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatShortDate(info.getValue(), { timeZone: "UTC" })}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_vencimiento", {
    header: "Vencimiento",
    cell: (info) => {
      // El resaltado de vencido usa la definición única `esta_vencida` (por
      // fecha), la MISMA que el KPI, la antigüedad y la columna "Días venc.".
      const overdue = info.row.original.esta_vencida;
      return (
        <span
          className={`tabular-nums ${
            overdue
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {formatShortDate(info.getValue(), { timeZone: "UTC" })}
        </span>
      );
    },
  }),
  columnHelper.accessor("total", {
    header: "Monto",
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatMoneyValue(
          info.getValue(),
          // Cada cuenta en la moneda de SU factura.
          info.row.original.moneda_codigo,
        )}
      </span>
    ),
  }),
  columnHelper.accessor("saldo", {
    header: "Saldo",
    meta: { align: "right" },
    cell: (info) => (
      <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
        {formatMoneyValue(
          info.getValue(),
          info.row.original.moneda_codigo,
        )}
      </span>
    ),
  }),
  columnHelper.accessor("estatus", {
    header: "Estatus",
    cell: (info) => <EstatusBadge estatus={info.getValue()} />,
  }),
  columnHelper.accessor("dias_vencido", {
    header: "Días venc.",
    cell: (info) => {
      // Se muestran los días de atraso cuando la cuenta está vencida según la
      // definición única `esta_vencida` (misma que el KPI "Vencido" y la
      // antigüedad): una vencida tiene al menos 1 día de atraso. "—" queda para
      // las NO vencidas (Pagada, Cancelada, sin fecha o que vencen hoy o después).
      const dias = info.getValue();
      return info.row.original.esta_vencida ? (
        <span className="text-red-600 dark:text-red-400 font-semibold tabular-nums">{dias}</span>
      ) : (
        <span className="text-slate-400 dark:text-slate-600">—</span>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: "Acciones",
    meta: { align: "center" },
    cell: ({ row }) => <ActionsCell row={row.original} onViewDetail={onViewDetail} />,
  }),
] as ColumnDef<CuentaPorCobrarRow>[];
