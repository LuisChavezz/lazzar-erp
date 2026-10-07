"use client";

import { ClientesIcon, DownloadIcon, EmailIcon, FacturacionIcon } from "@/src/components/Icons";
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
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import { INVOICE_ORIGIN_ID_PARAM } from "@/src/features/orders/constants/pedidoDetailOrigins";
import {
  AmountRow,
  SheetCard,
  SheetPanel,
  SheetSection,
} from "@/src/features/orders/components/OrderSheetPrimitives";
import { INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";
import { useInvoiceDocumentActions } from "../hooks/useInvoiceDocumentActions";
import type { Invoice } from "../interfaces/invoice.interface";
import type {
  InvoiceDesglose,
  InvoiceDesgloseSatKey,
} from "../interfaces/invoice-desglose.interface";
import { formatInvoiceDate } from "../utils/invoiceDetailFormat";
import { InvoiceConceptsSection } from "./InvoiceConceptsSection";

interface InvoiceMainSheetProps {
  data: InvoiceDesglose;
  /**
   * Retrieve: la fuente del PDF y del correo, igual que en el listado. `null`
   * si no se pudo cargar: entonces no se ofrece ninguna acción.
   */
  invoice: Invoice | null;
  /** ¿El usuario puede abrir esta ruta? (regla del proxy). */
  canOpen: (pathname: string) => boolean;
}

const satKeyLabel = (key: InvoiceDesgloseSatKey | null): string =>
  key ? [key.codigo, key.descripcion].filter(Boolean).join(" - ") : "—";

/**
 * Acciones del documento: las MISMAS reglas que el menú de la fila del
 * listado (`useInvoiceDocumentActions`), sobre el mismo `Invoice` del retrieve.
 */
function InvoiceDocumentActions({ invoice }: { invoice: Invoice }) {
  const actions = useInvoiceDocumentActions(invoice);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.canSendEmail && (
        <Button
          type="button"
          variant="secondary"
          onClick={actions.sendEmail}
          disabled={actions.emailDisabled}
          title={
            actions.hasNoRecipientEmail
              ? "Ni el pedido ni el cliente tienen correo de facturación."
              : undefined
          }
        >
          <EmailIcon className="w-4 h-4" aria-hidden="true" />
          {actions.isSendingEmail
            ? "Enviando..."
            : actions.hasNoRecipientEmail
              ? "Enviar correo (sin correo)"
              : "Enviar correo"}
        </Button>
      )}
      <Button
        type="button"
        variant="primary"
        onClick={actions.downloadPdf}
        disabled={actions.pdfDisabled}
      >
        <DownloadIcon className="w-4 h-4" aria-hidden="true" />
        {actions.isDownloadingPdf ? "Generando PDF..." : "Descargar PDF"}
      </Button>
    </div>
  );
}

/**
 * Hoja 1, "Factura": la factura en solo lectura. Cabecera (folio, estatus,
 * fechas, totales y acciones), emisor y receptor, pedido, conceptos e importes.
 * Todo sale del desglose; solo las acciones usan el retrieve.
 */
export function InvoiceMainSheet({ data, invoice, canOpen }: InvoiceMainSheetProps) {
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
          </div>
          {invoice && <InvoiceDocumentActions invoice={invoice} />}
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
