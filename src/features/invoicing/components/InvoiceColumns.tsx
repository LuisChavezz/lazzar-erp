"use client";

import Link from "next/link";
import { ColumnDef, FilterFn } from "@tanstack/react-table";
import { Invoice } from "../interfaces/invoice.interface";
import { ChevronRightIcon, DownloadIcon, EmailIcon } from "../../../components/Icons";
import { ActionMenu, ActionMenuItem } from "@/src/components/ActionMenu";
import { ColumnHeaderFilter, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";
import { invoiceDetailHref } from "../constants/invoiceDetailOrigins";
import { useInvoiceDocumentActions } from "../hooks/useInvoiceDocumentActions";

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
 * Primera columna: punto de estatus, folio y menú de la fila (no hay columna
 * "Acciones" aparte, convención de los listados; ver `PurchaseOrderColumns`).
 * El folio es un `<Link>` real a la página de detalle (clic central abre
 * pestaña nueva), así que el menú NO repite "Ver Detalles": lo abre el chevron
 * y solo trae correo y PDF. Sin folio se muestra `#id`.
 */
const FolioCell = ({ invoice }: { invoice: Invoice }) => {
  // Reglas de correo y PDF compartidas con la página de detalle (ver el hook).
  const actions = useInvoiceDocumentActions(invoice);
  const statusCfg = INVOICE_STATUS_CONFIG[invoice.estatus];
  const invoiceLabel = invoice.folio || `#${invoice.id}`;

  const menuItems: ActionMenuItem[] = [];

  if (actions.canSendEmail) {
    menuItems.push({
      label: actions.isSendingEmail
        ? "Enviando..."
        : actions.hasNoRecipientEmail
          ? "Enviar correo (sin correo)"
          : "Enviar correo",
      icon: EmailIcon,
      onSelect: actions.sendEmail,
      disabled: actions.emailDisabled,
      // Deja el menú abierto para ver el estado "Enviando...".
      keepOpenOnSelect: true,
    });
  }

  menuItems.push({
    label: actions.isDownloadingPdf ? "Generando PDF..." : "Descargar PDF",
    icon: DownloadIcon,
    onSelect: actions.downloadPdf,
    disabled: actions.pdfDisabled,
    keepOpenOnSelect: true,
  });

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusCfg?.dot ?? "bg-slate-400"}`}
        title={statusCfg?.label ?? invoice.estatus}
        aria-hidden="true"
      />
      <span className="sr-only">{statusCfg?.label ?? invoice.estatus}</span>
      <span className="group inline-flex items-center gap-1">
        <Link
          href={invoiceDetailHref(invoice.id, "invoicing")}
          title="Ver detalle"
          className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer"
        >
          {invoiceLabel}
        </Link>
        {/* "Descargar PDF" siempre es visible: el menú nunca queda vacío. */}
        <ActionMenu
          items={menuItems}
          ariaLabel={`Acciones de la factura ${invoiceLabel}`}
          align="start"
          trigger={
            <button
              type="button"
              aria-label={`Ver acciones de la factura ${invoiceLabel}`}
              title="Ver acciones"
              className="inline-flex items-center rounded p-0.5 cursor-pointer text-slate-400 dark:text-slate-500 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRightIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          }
        />
      </span>
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
