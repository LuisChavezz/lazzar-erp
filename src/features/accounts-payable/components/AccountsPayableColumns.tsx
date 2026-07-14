"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import {
  ViewIcon,
  ReceiptIcon,
  ListaPreciosIcon,
  OrdenesIcon,
} from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatShortDate } from "@/src/utils/formatDate";
import type {
  MockCxP,
  CxPEstatus,
} from "../interfaces/accounts-payable.interface";

// ── Badge de estatus (misma convención de color que Cuentas por Cobrar) ───────

const ESTATUS_CFG: Record<CxPEstatus, { label: string; cls: string; dot: string }> = {
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

const EstatusBadge = ({ estatus }: { estatus: CxPEstatus }) => {
  const cfg = ESTATUS_CFG[estatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} aria-hidden="true" />
      {cfg.label}
    </span>
  );
};

// ── Acciones de fila ──────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: MockCxP }) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => {} },
  ];

  if (row.estatus !== "pagada") {
    menuItems.push({ label: "Registrar pago", icon: ListaPreciosIcon, onSelect: () => {} });
  }

  menuItems.push({ label: "Ver factura proveedor", icon: ReceiptIcon, onSelect: () => {} });
  menuItems.push({ label: "Ver OC", icon: OrdenesIcon, onSelect: () => {} });

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<MockCxP>();

export const accountsPayableColumns = [
  columnHelper.accessor("folio", {
    header: "Folio CxP",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("proveedor_nombre", {
    header: "Proveedor",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("factura_folio", {
    header: "Factura prov.",
    cell: (info) => (
      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("oc_folio", {
    header: "OC",
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
      const overdue = info.row.original.dias_vencido > 0;
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
] as ColumnDef<MockCxP>[];
