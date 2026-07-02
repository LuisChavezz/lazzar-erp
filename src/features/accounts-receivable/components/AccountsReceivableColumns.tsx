"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon, ReceiptIcon, ListaPreciosIcon } from "@/src/components/Icons";
import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type {
  MockCxC,
  CxCEstatus,
} from "../interfaces/accounts-receivable.interface";

// ── Badge de estatus ──────────────────────────────────────────────────────────
// Dominio propio de CxC (no se comparte con el estatus de facturación):
// solo la presentación (StatusBadge) es genérica, los valores no.

const ESTATUS_CFG: Record<CxCEstatus, StatusBadgeConfigEntry> = {
  vigente: {
    label: "Vigente",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  vencida: {
    label: "Vencida",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  pagada: {
    label: "Pagada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  parcial: {
    label: "Parcial",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
};

const EstatusBadge = ({ estatus }: { estatus: CxCEstatus }) => (
  <StatusBadge status={estatus} config={ESTATUS_CFG} />
);

// timeZone "UTC" fija el día renderizado: las fechas de la maqueta se
// construyen a medianoche UTC, así el SSR (servidor en UTC) y la hidratación
// (navegador en cualquier zona) muestran el mismo día y no hay desajustes.
const formatDate = (value: Date) =>
  value.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Acciones de fila ──────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: MockCxC }) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => {} },
  ];

  if (row.estatus !== "pagada") {
    menuItems.push({ label: "Registrar cobro", icon: ListaPreciosIcon, onSelect: () => {} });
  }

  menuItems.push({ label: "Ver factura", icon: ReceiptIcon, onSelect: () => {} });

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<MockCxC>();

export const accountsReceivableColumns = [
  columnHelper.accessor("folio", {
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
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("fecha_vencimiento", {
    header: "Vencimiento",
    cell: (info) => {
      const overdue = info.row.original.dias_vencido > 0;
      return (
        <span
          className={`tabular-nums ${
            overdue
              ? "text-red-600 dark:text-red-400 font-semibold"
              : "text-slate-600 dark:text-slate-300"
          }`}
        >
          {formatDate(info.getValue())}
        </span>
      );
    },
  }),
  columnHelper.accessor("monto", {
    header: "Monto",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("saldo_pendiente", {
    header: "Saldo",
    cell: (info) => (
      <span className="text-slate-800 dark:text-white font-semibold tabular-nums">
        {formatCurrency(info.getValue())}
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
      const dias = info.getValue();
      return dias > 0 ? (
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
] as ColumnDef<MockCxC>[];
