"use client";

import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { ChevronRightIcon, ViewIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";
import { invoiceDetailHref } from "../constants/invoiceDetailOrigins";

const ESTATUS_FILTER_OPTIONS: ColumnFilterOption[] = [
  { value: undefined, label: "Todos" },
  ...Object.entries(INVOICE_STATUS_CONFIG).map(([estatus, cfg]) => ({
    value: estatus,
    label: cfg.label ?? estatus,
    dotClassName: cfg.dot,
  })),
];

const estatusFilterFn: FilterFn<Invoice> = (row, _columnId, filterValue) => {
  if (filterValue === undefined) return true;
  return row.original.estatus === filterValue;
};

// ── Celda de folio ────────────────────────────────────────────────────────────

/**
 * Primera columna: punto de estatus y folio. El folio con su chevron es el
 * disparador del menú de la fila (no hay columna "Acciones"), mismo patrón y
 * markup que `PurchaseOrderColumns` / `OperationsOrderColumns`: un clic en
 * cualquier parte abre el menú. "Ver detalles" va primero y es un ENLACE real
 * (`href` de `ActionMenu`), así que Ctrl+clic o clic medio abren la página en
 * otra pestaña. Sin folio se muestra `#id`, también en el `aria-label`.
 *
 * TEMPORAL: el menú solo trae "Ver detalles". El listado ligero del backend
 * (PR #349) ya no manda `activo`, `correo_facturas` ni `factura_detalles`, de
 * los que dependen la regla de correo y el PDF; ambas acciones siguen en la
 * página de detalle, que usa el retrieve completo. Volverán aquí cuando el
 * menú traiga el detalle al abrirse.
 */
const FolioCell = ({ invoice }: { invoice: Invoice }) => {
  const statusCfg = INVOICE_STATUS_CONFIG[invoice.estatus];
  const statusLabel = statusCfg?.label ?? invoice.estatus;
  const invoiceLabel = invoice.folio || `#${invoice.id}`;

  const menuItems: ActionMenuItem[] = [
    {
      label: "Ver detalles",
      icon: ViewIcon,
      href: invoiceDetailHref(invoice.id, "invoicing"),
    },
  ];

  return (
    <div className="flex items-center gap-2 min-w-0 overflow-hidden whitespace-nowrap">
      {/* Indicador, fuera del botón: no es parte de la acción. */}
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
        role="img"
        aria-label={statusLabel}
        title={statusLabel}
      />
      <ActionMenu
        items={menuItems}
        ariaLabel={`Acciones de la factura ${invoiceLabel}`}
        align="start"
        trigger={
          <button
            type="button"
            aria-label={`Ver acciones de la factura ${invoiceLabel}`}
            className="group inline-flex items-center gap-1 font-mono font-bold text-slate-800 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors cursor-pointer"
          >
            {invoiceLabel}
            <ChevronRightIcon
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all"
              aria-hidden="true"
            />
          </button>
        }
      />
    </div>
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

export const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "folio",
    header: ({ column }) => (
      <div className="flex items-center gap-1.5">
        <span>Folio</span>
        <ColumnHeaderFilter column={column} options={ESTATUS_FILTER_OPTIONS} label="estatus" />
      </div>
    ),
    filterFn: estatusFilterFn,
    cell: ({ row }) => <FolioCell invoice={row.original} />,
  },
  {
    accessorKey: "cliente_nombre",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="text-slate-700 dark:text-slate-200 font-medium">
        {row.getValue("cliente_nombre")}
      </span>
    ),
  },
  {
    accessorKey: "fecha_emision",
    header: "Fecha emisión",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_emision)}
      </span>
    ),
  },
  {
    accessorKey: "fecha_vencimiento",
    header: "Fecha vencimiento",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300 tabular-nums">
        {formatLocalDate(row.original.fecha_vencimiento)}
      </span>
    ),
  },
  {
    accessorKey: "total",
    header: "Total",
    meta: { align: "right" },
    // `total` es un string numérico; ordenamos numéricamente en vez de por
    // el orden alfanumérico que TanStack infiere para strings.
    sortingFn: (rowA, rowB) =>
      safeParseAmount(rowA.original.total) - safeParseAmount(rowB.original.total),
    cell: ({ row }) => (
      <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
        {formatCurrency(safeParseAmount(row.original.total), {
          currency: row.original.moneda_nombre,
        })}
      </div>
    ),
  },
  {
    accessorKey: "moneda_nombre",
    header: "Moneda",
    cell: ({ row }) => (
      <span className="text-slate-600 dark:text-slate-300">
        {row.getValue("moneda_nombre")}
      </span>
    ),
  },
];
