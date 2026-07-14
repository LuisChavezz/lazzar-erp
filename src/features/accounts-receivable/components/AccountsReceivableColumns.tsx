"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon, ReceiptIcon, ListaPreciosIcon } from "@/src/components/Icons";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type {
  CuentaPorCobrarRow,
  CxCEstatus,
} from "../interfaces/accounts-receivable.interface";

// ── Badge de estatus ──────────────────────────────────────────────────────────
// Dominio propio de CxC (no se comparte con el estatus de facturación): solo la
// presentación (StatusBadge) es genérica, los valores no. Las llaves son los
// valores exactos del backend; `StatusBadge` degrada con su estilo por defecto
// si llegara uno no listado.

const ESTATUS_CFG: Record<CxCEstatus, StatusBadgeConfigEntry> = {
  Pendiente: {
    label: "Pendiente",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  Parcial: {
    label: "Parcial",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  Pagada: {
    label: "Pagada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    label: "Cancelada",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Vencida: {
    label: "Vencida",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const EstatusBadge = ({ estatus }: { estatus: CxCEstatus }) => (
  <StatusBadge status={estatus} config={ESTATUS_CFG} />
);

// ── Acciones de fila ──────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: CuentaPorCobrarRow }) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => {} },
  ];

  // Solo tiene sentido registrar un cobro cuando queda saldo por cobrar.
  if (row.estatus !== "Pagada" && row.estatus !== "Cancelada") {
    menuItems.push({ label: "Registrar cobro", icon: ListaPreciosIcon, onSelect: () => {} });
  }

  menuItems.push({ label: "Ver factura", icon: ReceiptIcon, onSelect: () => {} });

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio_cxc}`} />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<CuentaPorCobrarRow>();

export const accountsReceivableColumns = [
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
        {info.getValue()}
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
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatMoneyValue(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("saldo", {
    header: "Saldo",
    cell: (info) => (
      <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
        {formatMoneyValue(info.getValue())}
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
      // antigüedad). Una cuenta que vence HOY está vencida con `dias_vencido = 0`
      // y muestra "0" (no "—"): "—" queda reservado para las genuinamente NO
      // vencidas (Pagada, Cancelada o de vencimiento futuro), nunca para una
      // vencida que también suma al KPI "Vencido".
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
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<CuentaPorCobrarRow>[];
