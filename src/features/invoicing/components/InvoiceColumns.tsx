"use client";

import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import type { InvoiceListRow } from "../interfaces/invoice.interface";
import { BanIcon, DownloadIcon, EmailIcon, ViewIcon } from "../../../components/Icons";
import type { ActionMenuItem } from "@/src/components/ActionMenu";
import { FolioActionMenu } from "@/src/components/FolioActionMenu";
import { StatusBadge } from "@/src/components/StatusBadge";
import { CancellationRequestedIndicator } from "@/src/components/CancellationRequestedIndicator";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";
import { optionsFromConfig } from "@/src/utils/columnFilterOptions";
import { formatCurrency, safeParseAmount } from "@/src/utils/formatCurrency";
import { formatLocalDate } from "@/src/utils/formatDate";
import { INVOICE_STATUS_CONFIG, isInvoiceSendable } from "../constants/invoiceStatus";
import { invoiceDetailHref } from "../constants/invoiceDetailOrigins";
import { useInvoiceRowActionsContext } from "../hooks/useInvoiceListDocumentActions";
import {
  INVOICE_NON_FISCAL_PDF_LABEL,
  INVOICE_NON_FISCAL_PDF_MESSAGE,
  invoiceEmailLabel,
  isInvoicePdfNonFiscal,
} from "../utils/invoiceStamping";
import {
  CANCEL_CANCELLED_INVOICE_CFDI_LABEL,
  INVOICE_CFDI_CANCELLATION_REQUESTED_HINT,
  INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL,
  getInvoiceCancelBlockReason,
  isInvoiceCfdiCancellationRequested,
} from "../utils/invoiceCancellation";
import {
  INVOICE_CFDI_STATE_CONFIG,
  getInvoiceCfdiState,
  getInvoiceCfdiStateLabel,
} from "../utils/invoiceCfdiState";

// ── Celda de folio ────────────────────────────────────────────────────────────

/**
 * Primera columna: el folio ES el menú de la fila (`FolioActionMenu`) y debajo
 * va su estatus —no hay columnas aparte "Estatus" ni "Acciones"—. "Ver
 * detalle" va primero y es un ENLACE real (`href`), así que Ctrl+clic o clic
 * medio abren la página en otra pestaña. Sin folio se muestra `#id`, también
 * en el nombre accesible. Callbacks, permisos y "en curso" llegan por
 * `InvoiceRowActionsProvider` (ver `useInvoiceListDocumentActions`), no por
 * las columnas. Abrir el menú no hace ninguna petición.
 *
 * "Descargar PDF" y "Enviar correo" piden el retrieve al activarse. "Enviar
 * correo" se oculta si el estatus no es enviable o si la fila trae
 * `activo === false`; además, al activarse se bloquea contra el retrieve
 * fresco. En una factura timbrada los dos se rotulan como no fiscales: el PDF
 * del ERP no es el CFDI (no lleva folio fiscal ni sello).
 *
 * "Cancelar factura" sigue la regla única `canCancelInvoice` (permiso +
 * `activo === true` + Borrador o Emitida). Solo ABRE el diálogo, que vive en
 * `InvoiceList`: si un filtro de estatus oculta la fila al quedar Cancelada, el
 * diálogo no se desmonta. Una timbrada también se cancela (el diálogo avisa
 * que primero va al SAT). Lo único que la bloquea es el timbrado pendiente de
 * confirmación (`getInvoiceCancelBlockReason`): el item se deshabilita con el
 * motivo debajo, y el precheck de `useCancelInvoice` lo vuelve a revisar con
 * el retrieve fresco al confirmar.
 *
 * "Cancelar CFDI ante el SAT" (EC-764) es para una factura YA `Cancelada` con
 * el CFDI vigente (`canCancelCancelledInvoiceCfdi`); nunca aparece junto a
 * "Cancelar factura". También solo abre su diálogo, que vive en `InvoiceList`.
 *
 * Con la cancelación del CFDI solicitada y pendiente de que el receptor la
 * acepte, junto al estatus va el reloj compartido
 * (`CancellationRequestedIndicator`). Es un estado válido, no uno obsoleto.
 */
const FolioCell = ({ invoice }: { invoice: InvoiceListRow }) => {
  const invoiceLabel = invoice.folio || `#${invoice.id}`;
  const { onDownloadPdf, onSendEmail, pendingIds, canCancel, onCancel, canCancelCfdi, onCancelCfdi } =
    useInvoiceRowActionsContext();
  const pending = pendingIds.includes(invoice.id);
  const nonFiscalPdf = isInvoicePdfNonFiscal(invoice);
  const cancelBlockReason = getInvoiceCancelBlockReason(invoice);

  const items: ActionMenuItem[] = [
    {
      label: "Ver detalle",
      icon: ViewIcon,
      href: invoiceDetailHref(invoice.id, "invoicing"),
    },
    {
      label: nonFiscalPdf ? INVOICE_NON_FISCAL_PDF_LABEL : "Descargar PDF",
      description: nonFiscalPdf ? INVOICE_NON_FISCAL_PDF_MESSAGE : undefined,
      icon: DownloadIcon,
      onSelect: () => onDownloadPdf(invoice.id),
      disabled: pending,
    },
    {
      label: invoiceEmailLabel({ nonFiscal: nonFiscalPdf }),
      description: nonFiscalPdf ? INVOICE_NON_FISCAL_PDF_MESSAGE : undefined,
      icon: EmailIcon,
      onSelect: () => onSendEmail(invoice.id),
      disabled: pending,
      visible: invoice.activo !== false && isInvoiceSendable(invoice.estatus),
    },
    {
      label: "Cancelar factura",
      icon: BanIcon,
      onSelect: () => onCancel(invoice),
      visible: canCancel(invoice),
      disabled: cancelBlockReason !== null,
      description: cancelBlockReason ?? undefined,
    },
    {
      label: CANCEL_CANCELLED_INVOICE_CFDI_LABEL,
      icon: BanIcon,
      onSelect: () => onCancelCfdi(invoice),
      visible: canCancelCfdi(invoice),
    },
  ];

  return (
    <FolioActionMenu
      folio={invoiceLabel}
      items={items}
      status={
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge status={invoice.estatus} config={INVOICE_STATUS_CONFIG} />
          {isInvoiceCfdiCancellationRequested(invoice) && (
            <CancellationRequestedIndicator
              label={INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL}
              hint={INVOICE_CFDI_CANCELLATION_REQUESTED_HINT}
            />
          )}
        </span>
      }
    />
  );
};

// ── Columnas ──────────────────────────────────────────────────────────────────

const columnHelper = createColumnHelper<InvoiceListRow>();

/** Texto del cliente: su nombre resuelto, o `Cliente #N` si llega vacío. */
const getClienteLabel = (invoice: InvoiceListRow): string =>
  invoice.cliente_nombre || `Cliente #${invoice.cliente}`;

/**
 * Columnas del listado de facturas. No reciben nada: callbacks y "en curso"
 * llegan por `InvoiceRowActionsProvider`, así una acción no remonta las celdas.
 */
export const getInvoiceColumns = () =>
  [
    columnHelper.accessor((row) => row.folio || `#${row.id}`, {
      id: "folio",
      header: "Folio",
      size: 170,
      cell: (info) => <FolioCell invoice={info.row.original} />,
    }),
    // El estatus se pinta bajo el folio; esta columna, OCULTA por defecto, lo
    // mantiene en la búsqueda global ("Cancelada") —TanStack busca también en
    // las columnas ocultas— y en el selector de columnas.
    columnHelper.accessor("estatus", {
      header: "Estatus",
      meta: { hiddenByDefault: true },
      cell: (info) => <StatusBadge status={info.getValue()} config={INVOICE_STATUS_CONFIG} />,
    }),
    // Estado del CFDI (`getInvoiceCfdiState`): independiente de `estatus`. El
    // valor de la columna es el rótulo, así que la búsqueda global lo encuentra.
    columnHelper.accessor((row) => getInvoiceCfdiStateLabel(row), {
      id: "cfdi",
      header: "CFDI",
      cell: (info) => (
        <StatusBadge
          status={getInvoiceCfdiState(info.row.original)}
          config={INVOICE_CFDI_STATE_CONFIG}
        />
      ),
    }),
    // Mismo texto en la celda, la búsqueda y la opción del filtro.
    columnHelper.accessor((row) => getClienteLabel(row), {
      id: "cliente_nombre",
      header: "Cliente",
      cell: (info) => (
        <span className="text-slate-700 dark:text-slate-200 font-medium">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor("fecha_emision", {
      header: "Fecha emisión",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.fecha_vencimiento ?? "", {
      id: "fecha_vencimiento",
      header: "Fecha vencimiento",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300 tabular-nums">
          {formatLocalDate(info.row.original.fecha_vencimiento)}
        </span>
      ),
    }),
    columnHelper.accessor("total", {
      header: "Total",
      meta: { align: "right" },
      // `total` es un string numérico; ordenamos numéricamente en vez de por
      // el orden alfanumérico que TanStack infiere para strings.
      sortingFn: (rowA, rowB) =>
        safeParseAmount(rowA.original.total) - safeParseAmount(rowB.original.total),
      cell: (info) => (
        <div className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
          {formatCurrency(safeParseAmount(info.getValue()), info.row.original.moneda_nombre)}
        </div>
      ),
    }),
    columnHelper.accessor("moneda_nombre", {
      header: "Moneda",
      cell: (info) => (
        <span className="text-slate-600 dark:text-slate-300">{info.getValue()}</span>
      ),
    }),
  ] as ColumnDef<InvoiceListRow>[];

/**
 * Filtros de encabezado (estilo Excel) de esta tabla, para `withHeaderFilters`:
 * - El folio filtra por `estatus` (su badge), con ficha "Estatus: …": el
 *   catálogo completo de `INVOICE_STATUS_CONFIG` y al final cada valor
 *   desconocido de las filas, crudo.
 * - «CFDI» filtra por `getInvoiceCfdiState`: los cinco estados, en su orden.
 * - El cliente es un FK: compara contra el id crudo y se rotula con el nombre
 *   (o `Cliente #N`), con buscador; dos homónimos no se mezclan.
 * - La moneda, por su código.
 *
 * Filtrar NO toca los KPIs (`InvoiceStats` lee el listado completo).
 */
export const getInvoiceHeaderFilters = (): Partial<
  Record<string, HeaderFilterSpec<InvoiceListRow>>
> => ({
  folio: {
    type: "options",
    filterLabel: "estatus",
    get: (r) => r.estatus,
    options: optionsFromConfig(INVOICE_STATUS_CONFIG),
  },
  cfdi: {
    type: "options",
    filterLabel: "CFDI",
    get: (r) => getInvoiceCfdiState(r),
    options: optionsFromConfig(INVOICE_CFDI_STATE_CONFIG),
  },
  cliente_nombre: { type: "distinct", get: (r) => r.cliente, label: getClienteLabel, searchable: true },
  moneda_nombre: { type: "distinct", get: (r) => r.moneda_nombre },
});
