"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EmptyLines,
  LineItemsTable,
  Section,
  textOrDash,
} from "@/src/components/DetailDialogPrimitives";
import { MetricCard } from "@/src/components/ProgressPrimitives";
import { StatusBadge } from "@/src/components/StatusBadge";
import { formatCurrency } from "@/src/utils/formatCurrency";
import { clampPercentage } from "@/src/utils/percentage";
import { PedidoFolioLink } from "@/src/features/orders/components/PedidoFolioLink";
import {
  INVOICE_ORIGIN_ID_PARAM,
  INVOICE_ORIGIN_SHEET_PARAM,
} from "@/src/features/orders/constants/pedidoDetailOrigins";
import { AccountsReceivableDetailDialog } from "@/src/features/accounts-receivable/components/AccountsReceivableDetailDialog";
import { CXC_ESTATUS_CONFIG } from "@/src/features/accounts-receivable/constants/cxcEstatus";
import { formatFolioCxc } from "@/src/features/accounts-receivable/utils/accounts-receivable.utils";
import { CreditNoteDetailByIdDialog } from "@/src/features/credit-notes/components/CreditNoteDetailByIdDialog";
import { NOTA_CREDITO_ESTATUS_CONFIG } from "@/src/features/credit-notes/constants/creditNoteStatus";
import { INVOICE_STATUS, INVOICE_STATUS_CONFIG } from "../constants/invoiceStatus";
import {
  buildInvoiceDetailHref,
  type InvoiceDetailQuery,
} from "../constants/invoiceDetailOrigins";
import type { InvoiceDesglose } from "../interfaces/invoice-desglose.interface";
import { formatInvoiceDate } from "../utils/invoiceDetailFormat";

/** Rutas cuyos detalles se abren desde aquí (sus diálogos viven en esos listados). */
const ACCOUNTS_RECEIVABLE_PATH = "/finance/accounts-receivable";
const CREDIT_NOTES_PATH = "/finance/credit-notes";

const LINK_CLASS =
  "font-mono font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline cursor-pointer text-left transition-colors";
const TH = "px-3 py-2 font-semibold";
const TD = "px-3 py-2 text-xs text-slate-600 dark:text-slate-300";

interface InvoiceTrackingSheetProps {
  data: InvoiceDesglose;
  /** Query actual: las parcialidades conservan el origen del "Volver". */
  query: InvoiceDetailQuery;
  canOpen: (pathname: string) => boolean;
}

/**
 * Hoja 2, "Seguimiento": lo que pasa ALREDEDOR de la factura — avance de
 * facturación del pedido, parcialidades (las demás facturas del pedido),
 * cobranza y notas de crédito. Los diálogos de CxC y de nota de crédito se
 * montan aquí: cambiar de hoja desmonta la hoja y con ella cualquier diálogo.
 * Un registro solo enlaza si el usuario puede abrir el listado donde vive su
 * detalle.
 */
export function InvoiceTrackingSheet({ data, query, canOpen }: InvoiceTrackingSheetProps) {
  const [openCxcId, setOpenCxcId] = useState<number | null>(null);
  const [openNotaId, setOpenNotaId] = useState<number | null>(null);
  const money = (value: number) => formatCurrency(value, { currency: data.moneda.codigo_iso });

  const { avance_pedido: avance, pedido } = data;
  const canOpenPedido = pedido !== null && canOpen(`/orders/${pedido.id}`);
  const canOpenCxc = canOpen(ACCOUNTS_RECEIVABLE_PATH);
  const canOpenNotas = canOpen(CREDIT_NOTES_PATH);
  const pctFacturado =
    avance && avance.piezas_pedidas > 0
      ? clampPercentage((avance.piezas_facturadas / avance.piezas_pedidas) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Identidad mínima: esta hoja no repite la cabecera de "Factura". */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-medium text-slate-900 dark:text-white">
          Seguimiento de la factura{" "}
          <span className="font-mono">{data.folio || `#${data.id}`}</span>
        </h1>
        <StatusBadge status={data.estatus} config={INVOICE_STATUS_CONFIG} />
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {textOrDash(data.receptor.razon_social || data.receptor.nombre)}
        </span>
      </div>

      {/* ── Avance del pedido ─────────────────────────────────────────────── */}
      <Section
        title="Avance de facturación del pedido"
        action={
          pedido &&
          (canOpenPedido ? (
            <PedidoFolioLink
              pedidoId={pedido.id}
              folio={pedido.folio}
              from="invoice"
              query={{
                [INVOICE_ORIGIN_ID_PARAM]: String(data.id),
                [INVOICE_ORIGIN_SHEET_PARAM]: "tracking",
              }}
            />
          ) : (
            <span className="font-mono text-sm text-slate-600 dark:text-slate-300">
              {textOrDash(pedido.folio)}
            </span>
          ))
        }
      >
        {avance ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard label="Piezas del pedido" done={`${avance.piezas_pedidas} pzas`} />
              <MetricCard
                label="Piezas facturadas"
                done={String(avance.piezas_facturadas)}
                total={`${avance.piezas_pedidas} pzas`}
              />
              <MetricCard label="Piezas pendientes" done={`${avance.piezas_pendientes} pzas`} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 dark:text-slate-400">Avance facturado</span>
                <span className="tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                  {Math.round(pctFacturado)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${pctFacturado}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                Cuenta las facturas activas no canceladas del pedido, Borrador incluido.
              </p>
            </div>
          </>
        ) : (
          <EmptyLines>Esta factura no está ligada a un pedido: no hay avance que medir.</EmptyLines>
        )}
      </Section>

      {/* ── Parcialidades ─────────────────────────────────────────────────── */}
      <Section title="Parcialidades del pedido">
        {data.parcialidades.length === 0 ? (
          <EmptyLines>
            {pedido
              ? "El pedido no tiene facturas activas."
              : "Esta factura no está ligada a un pedido: no tiene parcialidades."}
          </EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={`${TH} text-left`}>Folio</th>
                <th className={`${TH} text-left`}>Emisión</th>
                <th className={`${TH} text-left`}>Estatus</th>
                <th className={`${TH} text-right`}>Total</th>
              </>
            }
          >
            {data.parcialidades.map((parcialidad) => {
              const isCurrent = parcialidad.es_esta_factura;
              // Cancelada: se conserva (es historia del pedido) pero atenuada.
              const isCancelled = parcialidad.estatus === INVOICE_STATUS.CANCELADA;
              const folio = parcialidad.folio || `#${parcialidad.id}`;
              return (
                <tr
                  key={parcialidad.id}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`${
                    isCurrent ? "bg-sky-50 dark:bg-sky-500/10" : ""
                  } ${isCancelled ? "opacity-60" : ""}`}
                >
                  <td className={TD}>
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-800 dark:text-white">
                          {folio}
                        </span>
                        <span className="rounded-full bg-sky-100 dark:bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                          Esta factura
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={buildInvoiceDetailHref(parcialidad.id, query, "tracking")}
                        className={LINK_CLASS}
                        title={`Ver la factura ${folio}`}
                      >
                        {folio}
                      </Link>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatInvoiceDate(parcialidad.fecha_emision)}
                  </td>
                  <td className={TD}>
                    <StatusBadge status={parcialidad.estatus} config={INVOICE_STATUS_CONFIG} />
                  </td>
                  <td
                    className={`${TD} text-right tabular-nums ${
                      isCancelled ? "line-through" : "font-semibold text-slate-800 dark:text-white"
                    }`}
                  >
                    {money(parcialidad.total)}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </Section>

      {/* ── Cobranza ──────────────────────────────────────────────────────── */}
      <Section title="Cobranza">
        {data.cobranza.length === 0 ? (
          <EmptyLines>
            {data.estatus === INVOICE_STATUS.BORRADOR
              ? "Sin cuentas por cobrar: una factura en Borrador no genera cobranza."
              : "Esta factura no tiene cuentas por cobrar."}
          </EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={`${TH} text-left`}>Cuenta</th>
                <th className={`${TH} text-left`}>Estatus</th>
                <th className={`${TH} text-right`}>Total</th>
                <th className={`${TH} text-right`}>Saldo</th>
                <th className={`${TH} text-left`}>Vencimiento</th>
                <th className={`${TH} text-left`}>Último pago</th>
              </>
            }
          >
            {data.cobranza.map((cuenta) => {
              const folio = formatFolioCxc(cuenta.id);
              return (
                <tr key={cuenta.id}>
                  <td className={TD}>
                    {canOpenCxc ? (
                      <button
                        type="button"
                        onClick={() => setOpenCxcId(cuenta.id)}
                        className={LINK_CLASS}
                        title={`Ver la cuenta por cobrar ${folio}`}
                      >
                        {folio}
                      </button>
                    ) : (
                      <span className="font-mono">{folio}</span>
                    )}
                  </td>
                  <td className={TD}>
                    <StatusBadge status={cuenta.estatus} config={CXC_ESTATUS_CONFIG} />
                  </td>
                  <td className={`${TD} text-right tabular-nums`}>{money(cuenta.total)}</td>
                  <td className={`${TD} text-right tabular-nums font-semibold text-slate-800 dark:text-white`}>
                    {money(cuenta.saldo)}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatInvoiceDate(cuenta.fecha_vencimiento)}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatInvoiceDate(cuenta.fecha_ultimo_pago)}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </Section>

      {/* ── Notas de crédito ──────────────────────────────────────────────── */}
      <Section title="Notas de crédito">
        {data.notas_credito.length === 0 ? (
          <EmptyLines>Esta factura no tiene notas de crédito.</EmptyLines>
        ) : (
          <LineItemsTable
            head={
              <>
                <th className={`${TH} text-left`}>Folio</th>
                <th className={`${TH} text-left`}>Emisión</th>
                <th className={`${TH} text-left`}>Motivo</th>
                <th className={`${TH} text-left`}>Estatus</th>
                <th className={`${TH} text-right`}>Total</th>
              </>
            }
          >
            {data.notas_credito.map((nota) => {
              const folio = nota.folio || `#${nota.id}`;
              return (
                <tr key={nota.id}>
                  <td className={TD}>
                    {canOpenNotas ? (
                      <button
                        type="button"
                        onClick={() => setOpenNotaId(nota.id)}
                        className={LINK_CLASS}
                        title={`Ver la nota de crédito ${folio}`}
                      >
                        {folio}
                      </button>
                    ) : (
                      <span className="font-mono">{folio}</span>
                    )}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>
                    {formatInvoiceDate(nota.fecha_emision)}
                  </td>
                  <td className={TD}>{textOrDash(nota.motivo)}</td>
                  <td className={TD}>
                    <StatusBadge status={nota.estatus} config={NOTA_CREDITO_ESTATUS_CONFIG} />
                  </td>
                  <td className={`${TD} text-right tabular-nums font-semibold text-slate-800 dark:text-white`}>
                    {money(nota.total)}
                  </td>
                </tr>
              );
            })}
          </LineItemsTable>
        )}
      </Section>

      {/* Se montan solo al abrir: cada diálogo trae su propio detalle por id. */}
      {openCxcId !== null && (
        <AccountsReceivableDetailDialog
          cuentaId={openCxcId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenCxcId(null);
          }}
        />
      )}
      {openNotaId !== null && (
        <CreditNoteDetailByIdDialog
          notaId={openNotaId}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenNotaId(null);
          }}
        />
      )}
    </div>
  );
}
