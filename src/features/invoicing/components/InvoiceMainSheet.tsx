"use client";

import {
  BanIcon,
  ClientesIcon,
  DownloadIcon,
  EmailIcon,
  FacturacionIcon,
  PaperPlaneIcon,
  ShieldCheckIcon,
} from "@/src/components/Icons";
import { Button } from "@/src/components/Button";
import { StatusBadge } from "@/src/components/StatusBadge";
import {
  HeaderStat,
  HeaderStatRow,
  InfoField,
  InfoGrid,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { formatShortDateTime } from "@/src/utils/formatDate";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { INVOICE_ORIGIN_ID_PARAM } from "@/src/features/orders/constants/pedidoDetailOrigins";
import {
  AmountRow,
  SheetCard,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { useInvoiceDocumentActions } from "../hooks/useInvoiceDocumentActions";
import type { Invoice } from "../interfaces/invoice.interface";
import type {
  InvoiceDesglose,
  InvoiceDesgloseSatKey,
} from "../interfaces/invoice-desglose.interface";
import { formatInvoiceDate } from "../utils/invoiceDetailFormat";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import {
  INVOICE_CFDI_CANCELLED_ERP_PENDING_MESSAGE,
  INVOICE_CFDI_CANCELLED_LABEL,
  INVOICE_CFDI_CANCELLATION_REQUESTED_HINT,
  INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL,
  INVOICE_CFDI_VALID_AFTER_ERP_CANCEL_MESSAGE,
  INVOICE_CFDI_VALID_LABEL,
  canCancelInvoice,
  getInvoiceCancelBlockReason,
  isInvoiceCfdiCancellationRequested,
  isInvoiceCfdiCancelled,
} from "../utils/invoiceCancellation";
import { INVOICE_STATUS, INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";
import {
  INVOICE_NON_FISCAL_PDF_LABEL,
  INVOICE_NON_FISCAL_PDF_MESSAGE,
  INVOICE_STAMP_CURRENCY_MESSAGE,
  INVOICE_STAMP_PENDING_LABEL,
  INVOICE_STAMP_PENDING_MESSAGE,
  canStampInvoice,
  isInvoiceStampCurrencySupported,
  isInvoicePdfNonFiscal,
  isInvoiceStampPending,
  invoiceEmailLabel,
} from "../utils/invoiceStamping";
import { InvoiceConceptsSection } from "./InvoiceConceptsSection";
import { InvoiceCancelDialog } from "./InvoiceCancelDialog";
import { InvoiceStampDialog } from "./InvoiceStampDialog";
import { InvoiceCfdiEmailDialog } from "./InvoiceCfdiEmailDialog";
import { getInvoiceCfdiEmailAvailability } from "../utils/invoiceCfdiEmail";
import { DocumentActionWithDialog } from "./DocumentActionWithDialog";

interface InvoiceMainSheetProps {
  data: InvoiceDesglose;
  /**
   * Retrieve: la fuente del PDF y del correo, igual que en el listado. `null`
   * si no se pudo cargar: entonces no se ofrece ninguna acción.
   */
  invoice: Invoice | null;
  /** ¿El usuario puede abrir esta ruta? (regla del proxy). */
  canOpen: (pathname: string) => boolean;
  /** Usuario de la sesión (permisos), para las reglas de "Cancelar factura" y "Timbrar". */
  user: PermissionContext | null | undefined;
}

const satKeyLabel = (key: InvoiceDesgloseSatKey | null): string =>
  key ? [key.codigo, key.descripcion].filter(Boolean).join(" - ") : "—";

/**
 * Acciones del documento: las MISMAS reglas que el menú de la fila del
 * listado (`useInvoiceDocumentActions`), sobre el mismo `Invoice` del retrieve.
 * "Timbrar" y "Enviar CFDI" solo existen aquí, nunca en el menú del listado. Debajo de los
 * botones va, en texto visible, el motivo de los que estén bloqueados (el
 * `title` de un botón deshabilitado no se muestra en todos los navegadores) y,
 * en una factura timbrada, el aviso de que el PDF del ERP no es el CFDI.
 */
function InvoiceDocumentActions({
  invoice,
  user,
}: {
  invoice: Invoice;
  user: PermissionContext | null | undefined;
}) {
  const actions = useInvoiceDocumentActions(invoice);
  const canCancel = canCancelInvoice(invoice, user);
  const cancelBlockReason = canCancel ? getInvoiceCancelBlockReason(invoice) : null;
  const canStamp = canStampInvoice(invoice, user);
  // Un timbrado sin confirmar manda sobre la moneda: es lo que hay que revisar primero.
  const stampBlockReason = !canStamp
    ? null
    : isInvoiceStampPending(invoice)
      ? INVOICE_STAMP_PENDING_MESSAGE
      : !isInvoiceStampCurrencySupported(invoice)
        ? INVOICE_STAMP_CURRENCY_MESSAGE
        : null;
  const cfdiEmail = getInvoiceCfdiEmailAvailability(invoice, user);
  const nonFiscalPdf = isInvoicePdfNonFiscal(invoice);
  const cancelNoteId = `invoice-${invoice.id}-cancel-note`;
  const stampNoteId = `invoice-${invoice.id}-stamp-note`;
  const cfdiEmailNoteId = `invoice-${invoice.id}-cfdi-email-note`;
  const nonFiscalNoteId = `invoice-${invoice.id}-non-fiscal-note`;

  return (
    <div className="flex flex-col gap-2 lg:items-end">
      <div className="flex flex-wrap items-center gap-2">
        {/* "Cancelar factura": misma regla que el menú del listado (`canCancelInvoice`)
            sobre el retrieve, que es quien trae `activo`. Una timbrada se cancela (el
            diálogo avisa que primero va al SAT); con el timbrado pendiente de
            confirmación se muestra bloqueado y descrito por su nota. */}
        <DocumentActionWithDialog
          offered={canCancel}
          blockedNoteId={cancelBlockReason ? cancelNoteId : undefined}
          icon={BanIcon}
          label="Cancelar factura"
          className="text-rose-600! dark:text-rose-400!"
          renderDialog={(dialog) => <InvoiceCancelDialog invoice={invoice} {...dialog} />}
        />
        {/* "Timbrar": solo con `E-FIN-FACTURAS` y una `Emitida` activa sin CFDI
            (`canStampInvoice`); con el timbrado pendiente de confirmación o en otra
            moneda, bloqueado y descrito por su nota. */}
        <DocumentActionWithDialog
          offered={canStamp}
          blockedNoteId={stampBlockReason ? stampNoteId : undefined}
          icon={ShieldCheckIcon}
          label="Timbrar"
          renderDialog={(dialog) => <InvoiceStampDialog invoice={invoice} {...dialog} />}
        />
        {/* "Enviar CFDI": el PDF y el XML oficiales. Mismo permiso que "Enviar correo";
            oculto en una eliminada y bloqueado, con su nota, si está cancelada, con el
            CFDI cancelado ante el SAT, con el timbrado pendiente o sin timbrar
            (`getInvoiceCfdiEmailAvailability`). */}
        <DocumentActionWithDialog
          offered={cfdiEmail.state !== "hidden"}
          blockedNoteId={cfdiEmail.state === "blocked" ? cfdiEmailNoteId : undefined}
          icon={PaperPlaneIcon}
          label="Enviar CFDI"
          renderDialog={(dialog) => <InvoiceCfdiEmailDialog invoice={invoice} {...dialog} />}
        />
        {actions.canSendEmail && (
          <Button
            type="button"
            variant="secondary"
            onClick={actions.sendEmail}
            disabled={actions.emailDisabled}
            title={actions.noRecipientMessage}
            aria-describedby={nonFiscalPdf ? nonFiscalNoteId : undefined}
          >
            <EmailIcon className="w-4 h-4" aria-hidden="true" />
            {actions.isSendingEmail
              ? "Enviando..."
              : invoiceEmailLabel({
                  nonFiscal: nonFiscalPdf,
                  noRecipient: actions.hasNoRecipientEmail,
                })}
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={actions.downloadPdf}
          disabled={actions.pdfDisabled}
          aria-describedby={nonFiscalPdf ? nonFiscalNoteId : undefined}
        >
          <DownloadIcon className="w-4 h-4" aria-hidden="true" />
          {actions.isDownloadingPdf
            ? "Generando PDF..."
            : nonFiscalPdf
              ? INVOICE_NON_FISCAL_PDF_LABEL
              : "Descargar PDF"}
        </Button>
      </div>
      {nonFiscalPdf && (
        <p id={nonFiscalNoteId} className="text-xs text-slate-500 dark:text-slate-400 max-w-md lg:text-right">
          {INVOICE_NON_FISCAL_PDF_MESSAGE}
        </p>
      )}
      {cancelBlockReason && (
        <p id={cancelNoteId} className="text-xs text-slate-500 dark:text-slate-400 max-w-md lg:text-right">
          {cancelBlockReason}
        </p>
      )}
      {stampBlockReason && (
        <p id={stampNoteId} className="text-xs text-slate-500 dark:text-slate-400 max-w-md lg:text-right">
          {stampBlockReason}
        </p>
      )}
      {cfdiEmail.state === "blocked" && (
        <p id={cfdiEmailNoteId} className="text-xs text-slate-500 dark:text-slate-400 max-w-md lg:text-right">
          {cfdiEmail.message}
        </p>
      )}
    </div>
  );
}

/**
 * Folio fiscal del CFDI y fecha de timbrado o, sin UUID y con un timbrado sin
 * confirmar (`cfdi_pendiente`), el indicador de pendiente en el mismo lugar.
 * Con el CFDI cancelado ante el SAT (`cfdi_cancelado`) agrega su estado, y si
 * la factura sigue `Emitida` (falló la parte del ERP), la nota de que falta
 * cancelarla en el ERP; "Cancelar factura" sigue habilitado para completarlo.
 * Con la cancelación solicitada y pendiente de que el receptor la acepte
 * (`isInvoiceCfdiCancellationRequested`) muestra ese estado. En una `Emitida`,
 * "Cancelar factura" vuelve a consultar al SAT; en una `Cancelada` el ERP no
 * ofrece cómo reintentar, así que solo se agrega la nota de que su CFDI no se
 * canceló ante el SAT.
 * Una `Cancelada` con UUID y SIN `cfdi_cancelado` (cancelada antes de que
 * `cancelar/` cancelara el CFDI) muestra que el CFDI sigue vigente, sin acción.
 * Salen del retrieve: el desglose no trae ningún campo de timbrado.
 */
function InvoiceCfdiStamp({ invoice }: { invoice: Invoice }) {
  if (!invoice.cfdi_uuid) {
    if (!isInvoiceStampPending(invoice)) return null;
    return (
      <HeaderStatRow>
        <HeaderStat label="Estado del CFDI">
          <span className="text-amber-600 dark:text-amber-400 font-medium">{INVOICE_STAMP_PENDING_LABEL}</span>
        </HeaderStat>
      </HeaderStatRow>
    );
  }
  return (
    <HeaderStatRow>
      <HeaderStat label="Folio fiscal (UUID)">
        <span className="font-mono break-all select-all">{invoice.cfdi_uuid}</span>
      </HeaderStat>
      <HeaderStat label="Fecha de timbrado">{formatShortDateTime(invoice.cfdi_fecha_timbrado)}</HeaderStat>
      {isInvoiceCfdiCancelled(invoice) ? (
        <HeaderStat label="Estado del CFDI">
          <span className="text-rose-600 dark:text-rose-400 font-medium">{INVOICE_CFDI_CANCELLED_LABEL}</span>
          {invoice.estatus === INVOICE_STATUS.EMITIDA && (
            <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">
              {INVOICE_CFDI_CANCELLED_ERP_PENDING_MESSAGE}
            </span>
          )}
        </HeaderStat>
      ) : isInvoiceCfdiCancellationRequested(invoice) ? (
        <HeaderStat label="Estado del CFDI">
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            {INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL}
          </span>
          <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">
            {INVOICE_CFDI_CANCELLATION_REQUESTED_HINT}
          </span>
          {invoice.estatus === INVOICE_STATUS.CANCELADA && (
            <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">
              {INVOICE_CFDI_VALID_AFTER_ERP_CANCEL_MESSAGE}
            </span>
          )}
        </HeaderStat>
      ) : (
        invoice.estatus === INVOICE_STATUS.CANCELADA && (
          <HeaderStat label="Estado del CFDI">
            <span className="text-amber-600 dark:text-amber-400 font-medium">{INVOICE_CFDI_VALID_LABEL}</span>
            <span className="block text-xs font-normal text-amber-600 dark:text-amber-400">
              {INVOICE_CFDI_VALID_AFTER_ERP_CANCEL_MESSAGE}
            </span>
          </HeaderStat>
        )
      )}
    </HeaderStatRow>
  );
}

/**
 * Hoja 1, "Factura": la factura en solo lectura. Cabecera (folio, estatus,
 * fechas, totales y acciones), emisor y receptor, pedido, conceptos e importes.
 * Todo sale del desglose; solo las acciones usan el retrieve.
 */
export function InvoiceMainSheet({ data, invoice, canOpen, user }: InvoiceMainSheetProps) {
  const money = (value: number) => formatCurrency(value, { currency: data.moneda.codigo_iso });
  const { emisor, receptor, pedido, importes } = data;

  return (
    <div className="space-y-6">
      {/* ── Cabecera ─────────────────────────────────────────────────────── */}
      <SheetSection
        icon={<FacturacionIcon className="w-6 h-6" />}
        title="Factura"
        subtitle="Comprobante de venta del pedido."
        badges={<StatusBadge status={data.estatus} config={INVOICE_STATUS_CONFIG} />}
      >
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0 space-y-4">
            {/* El folio es el ÚNICO <h1> de esta hoja (la de Seguimiento tiene el suyo). */}
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono break-all">
              {data.folio || `#${data.id}`}
            </h1>
            <HeaderStatRow>
              <HeaderStat label="Fecha de emisión">{formatInvoiceDate(data.fecha_emision)}</HeaderStat>
              <HeaderStat label="Fecha de vencimiento">
                {data.fecha_vencimiento ? formatInvoiceDate(data.fecha_vencimiento) : "Sin vencimiento"}
              </HeaderStat>
              <HeaderStat label="Moneda">{data.moneda.codigo_iso}</HeaderStat>
              <HeaderStat label="Piezas">
                <span className="tabular-nums">{importes.total_piezas} pzas</span>
              </HeaderStat>
              <HeaderStat label="Total" bold>
                <span className="tabular-nums">{money(importes.total)}</span>
              </HeaderStat>
            </HeaderStatRow>
            {invoice && <InvoiceCfdiStamp invoice={invoice} />}
          </div>
          {invoice && <InvoiceDocumentActions invoice={invoice} user={user} />}
        </div>
      </SheetSection>

      {/* ── Emisor, receptor y pedido ────────────────────────────────────── */}
      <SheetSection
        icon={<ClientesIcon className="w-6 h-6" />}
        title="Datos fiscales"
        subtitle="Emisor, receptor y el pedido que se factura."
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <SheetPanel title="Emisor">
            <InfoGrid>
              <InfoField label="Razón social" className="col-span-2">
                {textOrDash(emisor.razon_social)}
              </InfoField>
              <InfoField label="RFC">{textOrDash(emisor.rfc)}</InfoField>
              <InfoField label="Nombre comercial" className="col-span-2">
                {textOrDash(emisor.nombre_comercial)}
              </InfoField>
              <InfoField label="Sucursal">{textOrDash(emisor.sucursal_nombre)}</InfoField>
            </InfoGrid>
          </SheetPanel>

          <SheetPanel title="Receptor">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 -mt-2">
              Datos fiscales congelados en el pedido; el que falte se toma del cliente.
            </p>
            <InfoGrid>
              <InfoField label="Cliente">{textOrDash(receptor.nombre)}</InfoField>
              <InfoField label="Razón social" className="col-span-2">
                {textOrDash(receptor.razon_social)}
              </InfoField>
              <InfoField label="RFC">{textOrDash(receptor.rfc)}</InfoField>
              <InfoField label="Régimen fiscal" className="col-span-2">
                {satKeyLabel(receptor.regimen_fiscal)}
              </InfoField>
              <InfoField label="C.P.">{textOrDash(receptor.codigo_postal)}</InfoField>
              <InfoField label="Correo de facturación" className="col-span-2">
                <span className="break-all">{textOrDash(receptor.correo_facturas)}</span>
              </InfoField>
            </InfoGrid>
          </SheetPanel>
        </div>

        <SheetPanel title="Pedido" className="mt-6">
          {pedido ? (
            <InfoGrid>
              <InfoField label="Folio">
                {/* Enlace solo si el usuario puede abrir el detalle de pedido
                    (su regla exige otros permisos que facturación). */}
                {canOpen(`/orders/${pedido.id}`) ? (
                  <PedidoFolioLink
                    pedidoId={pedido.id}
                    folio={pedido.folio}
                    from="invoice"
                    query={{ [INVOICE_ORIGIN_ID_PARAM]: String(data.id) }}
                    className="font-mono text-slate-700 dark:text-slate-200"
                  />
                ) : (
                  <span className="font-mono">{textOrDash(pedido.folio)}</span>
                )}
              </InfoField>
              <InfoField label="O.C.">{textOrDash(pedido.oc)}</InfoField>
              <InfoField label="Forma de pago">
                {textOrDash(pedido.forma_pago_nombre ?? pedido.forma_pago)}
              </InfoField>
              <InfoField label="Método de pago">
                {textOrDash(pedido.metodo_pago_nombre ?? pedido.metodo_pago)}
              </InfoField>
              <InfoField label="Uso de CFDI" className="col-span-2">
                {textOrDash(pedido.uso_cfdi_nombre ?? pedido.uso_cfdi)}
              </InfoField>
            </InfoGrid>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Esta factura no está ligada a un pedido.
            </p>
          )}
        </SheetPanel>
      </SheetSection>

      {/* ── Conceptos ─────────────────────────────────────────────────────── */}
      <InvoiceConceptsSection conceptos={data.conceptos} money={money} />

      {/* ── Observaciones | Importes ─────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        <div className="lg:col-span-2">
          <SheetCard>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
              Observaciones
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
              {textOrDash(data.observaciones)}
            </p>
          </SheetCard>
        </div>
        <div className="lg:col-span-2">
          <SheetCard>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-4">Importes</h3>
            <div className="space-y-3">
              <AmountRow label="Piezas" value={`${importes.total_piezas} pzas`} />
              <AmountRow label="Subtotal" value={money(importes.subtotal)} />
              {importes.descuento > 0 && (
                <AmountRow label="Descuento" value={`− ${money(importes.descuento)}`} />
              )}
              <AmountRow label="Impuestos" value={money(importes.impuestos)} />
              <div className="border-t border-slate-100 dark:border-white/10 pt-3">
                <AmountRow label="Total" value={money(importes.total)} emphasis />
              </div>
            </div>
          </SheetCard>
        </div>
      </section>
    </div>
  );
}
