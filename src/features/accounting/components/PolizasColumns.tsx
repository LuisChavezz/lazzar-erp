"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { ActionMenu, type ActionMenuItem } from "@/src/components/ActionMenu";
import { ViewIcon, EditIcon, RejectIcon } from "@/src/components/Icons";
import { formatCurrency } from "@/src/utils/formatCurrency";
import type {
  MockPoliza,
  PolizaTipo,
  PolizaEstatus,
  PolizaOrigen,
} from "../interfaces/accounting-entry.interface";

// ── Badges ────────────────────────────────────────────────────────────────────

const TIPO_CFG: Record<PolizaTipo, { label: string; cls: string; dot: string }> = {
  ingreso: { label: "Ingreso", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  egreso: { label: "Egreso", cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
  diario: { label: "Diario", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400", dot: "bg-sky-400" },
  cierre: { label: "Cierre", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400", dot: "bg-violet-500" },
};

const ESTATUS_CFG: Record<PolizaEstatus, { label: string; cls: string; dot: string }> = {
  contabilizada: { label: "Contabilizada", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400", dot: "bg-emerald-500" },
  borrador: { label: "Borrador", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400", dot: "bg-amber-400" },
  cancelada: { label: "Cancelada", cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400", dot: "bg-red-500" },
};

const ORIGEN_CFG: Record<PolizaOrigen, { label: string; cls: string }> = {
  manual: { label: "Manual", cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300" },
  factura: { label: "Factura", cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400" },
  factura_proveedor: { label: "Factura prov.", cls: "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" },
  pago: { label: "Pago", cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400" },
  cobro: { label: "Cobro", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" },
  nomina: { label: "Nómina", cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400" },
  banco: { label: "Banco", cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400" },
};

const Pill = ({ cls, dot, children }: { cls: string; dot?: string; children: React.ReactNode }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}
  >
    {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} aria-hidden="true" />}
    {children}
  </span>
);

// timeZone "UTC" mantiene el día renderizado estable entre SSR e hidratación.
const formatDate = (value: Date) =>
  value.toLocaleDateString("es-MX", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ── Acciones de fila ──────────────────────────────────────────────────────────

const ActionsCell = ({ row }: { row: MockPoliza }) => {
  const menuItems: ActionMenuItem[] = [
    { label: "Ver detalle", icon: ViewIcon, onSelect: () => {} },
  ];

  if (row.estatus === "borrador") {
    menuItems.push({ label: "Editar", icon: EditIcon, onSelect: () => {} });
  }

  if (row.estatus !== "cancelada") {
    menuItems.push({ label: "Cancelar póliza", icon: RejectIcon, onSelect: () => {} });
  }

  return (
    <div className="flex items-center justify-center">
      <ActionMenu items={menuItems} ariaLabel={`Acciones de ${row.folio}`} />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<MockPoliza>();

export const polizasColumns = [
  columnHelper.accessor("folio", {
    header: "Folio",
    cell: (info) => (
      <span className="font-mono text-slate-700 dark:text-slate-200 font-semibold">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("tipo", {
    header: "Tipo",
    cell: (info) => {
      const cfg = TIPO_CFG[info.getValue()];
      return (
        <Pill cls={cfg.cls} dot={cfg.dot}>
          {cfg.label}
        </Pill>
      );
    },
  }),
  columnHelper.accessor("fecha", {
    header: "Fecha",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatDate(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("concepto", {
    header: "Concepto",
    cell: (info) => (
      <span className="text-slate-700 dark:text-slate-200">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor("origen", {
    header: "Origen",
    cell: (info) => {
      const cfg = ORIGEN_CFG[info.getValue()];
      return <Pill cls={cfg.cls}>{cfg.label}</Pill>;
    },
  }),
  columnHelper.accessor("total_cargos", {
    header: "Cargos",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("total_abonos", {
    header: "Abonos",
    cell: (info) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("estatus", {
    header: "Estatus",
    cell: (info) => {
      const cfg = ESTATUS_CFG[info.getValue()];
      return (
        <Pill cls={cfg.cls} dot={cfg.dot}>
          {cfg.label}
        </Pill>
      );
    },
  }),
  columnHelper.display({
    id: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell row={row.original} />,
  }),
] as ColumnDef<MockPoliza>[];
