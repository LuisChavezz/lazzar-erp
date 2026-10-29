"use client";

import { RejectIcon } from "@/src/components/Icons";
import { useCurrencies } from "@/src/features/currency/hooks/useCurrencies";
import { findCurrency, getCurrencyLabel } from "@/src/features/currency/utils/currencyLookup";
import { getStatusStyles } from "../utils/getStatusStyle";
import { QuoteComentariosHistory } from "./QuoteComentariosHistory";
import { useQuote, type QuoteDetailSource } from "../hooks/useQuote";
import { useQuoteComentarios } from "../hooks/useQuoteComentarios";
import { QuoteDetailsProducts } from "./QuoteDetailsProducts";
import { formatQuoteAmount } from "../utils/formatQuoteAmount";
import { RecompraBadge } from "./RecompraBadge";
import {
  formatQuoteDateTime,
  getEnabledOptionLabels,
  toDisplayValue,
} from "../utils/quoteDetailsFormatters";

/**
 * Grupo de datos con estilo de "lista agrupada" (como Ajustes de iOS): un
 * rótulo pequeño encima y una tarjeta con renglones separados por un filete.
 */
function DetailGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 ml-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

/** Renglón etiqueta / valor de un `DetailGroup`. */
function DetailRow({
  label,
  children,
  strong = false,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="shrink-0 text-[13px] text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`min-w-0 text-right text-[13px] break-words ${
          strong
            ? "font-bold text-slate-900 dark:text-white"
            : "font-medium text-slate-800 dark:text-slate-100"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

interface QuoteDetailsProps {
  quoteId: number;
  /**
   * Recurso por el que se pregunta primero (ante un 404 se reintenta en el
   * otro). Se omite en todas las vistas salvo en Mesa de Control, que pasa
   * `"mesa-control"` porque su usuario no es el vendedor y
   * `/ventas/cotizaciones/{id}/` le responde 404.
   */
  source?: QuoteDetailSource;
}

export const QuoteDetails = ({ quoteId, source }: QuoteDetailsProps) => {
  const { data: quote, isLoading, isError } = useQuote(quoteId, source);
  // Arranca junto con el detalle, antes de los retornos de carga/error: si
  // viviera dentro de la sección, esperaría a que el detalle respondiera.
  const comentariosQuery = useQuoteComentarios(quoteId, source);
  // La cotización solo trae la PK de la moneda; el código y el nombre salen
  // del catálogo (misma consulta que el formulario).
  const { data: currencies } = useCurrencies();

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-live="polite" aria-label="Cargando detalles de la cotización">
        <div className="h-24 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-56 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
        <div className="h-48 rounded-xl bg-slate-200/70 dark:bg-white/10 animate-pulse" />
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
        No se pudieron cargar los detalles de la cotización.
      </div>
    );
  }

  const statusClassName = getStatusStyles(quote);
  const currency = findCurrency(currencies, quote.moneda);
  // Mientras el catálogo carga o si la PK no aparece, "-" (nunca el id crudo).
  const currencyLabel = currency ? getCurrencyLabel(currency) : null;
  // Importes con el código de la moneda ("USD 140.48"): el "$" es igual en
  // pesos y en dólares. Sin código conocido (catálogo cargando, con error o sin
  // esa moneda) van sin símbolo: nunca se asume pesos, igual que en el pedido
  // (`OrderCurrencyContext`).
  const formatAmount = (value?: string | number | null) =>
    value === null || value === undefined || value === ""
      ? "-"
      : formatQuoteAmount(Number(value) || 0, currency?.codigo_iso ?? null);
  const piezas = quote.detalles.reduce( // Sumar de todos los detalles
    (total, detalle) => total + detalle.tallas.reduce((sum, talla) => sum + (Number(talla.cantidad) || 0), 0),
    0
  );
  const condiciones = getEnabledOptionLabels([
    { label: "Anticipo total", active: quote.anticipo_total },
    { label: "Anticipo parcial", active: quote.anticipo_parcial },
    { label: "Vendedor autoriza", active: quote.vendedor_autoriza },
    { label: "Pago antes embarque", active: quote.pago_antes_embarque },
    { label: "Por confirmar", active: quote.por_confirmar },
    { label: "Otra cantidad", active: quote.otra_cantidad },
  ]);

  return (
    <div className="space-y-5">
      {/* ── Tarjeta principal: cliente, estatus y total ──────────────────── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-linear-to-b from-slate-50 to-white dark:from-white/5 dark:to-transparent p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cotización #{toDisplayValue(quote.id)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClassName}`}>
                {quote.estatus_label}
              </span>
              {quote.recompra && <RecompraBadge />}
            </div>
            <p className="mt-1.5 text-xl font-bold text-slate-900 dark:text-white truncate">
              {toDisplayValue(quote.cliente_nombre || quote.cliente_razon_social)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
              {toDisplayValue(quote.cliente_razon_social)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total
            </p>
            <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
              {formatAmount(quote.gran_total)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {piezas} {piezas === 1 ? "pieza" : "piezas"} · {formatQuoteDateTime(quote.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Solo en estatus 4: el backend nunca limpia `motivo_rechazo`, así que
          en cualquier otro estatus describiría un rechazo ya superado (el
          historial de abajo conserva todos). */}
      {quote.estatus === 4 && quote.motivo_rechazo?.trim() && (
        <div
          role="note"
          aria-label="Motivo del rechazo"
          className="flex gap-3 rounded-2xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-500/10 p-4"
        >
          <RejectIcon className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">
              Cotización rechazada por mesa de control
            </p>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-200 whitespace-pre-wrap wrap-break-word">
              {quote.motivo_rechazo}
            </p>
          </div>
        </div>
      )}

      <QuoteComentariosHistory query={comentariosQuery} />

      {/* ── Datos en listas agrupadas, en dos columnas ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-5 min-w-0">
          <DetailGroup title="Facturación y pagos">
            <DetailRow label="Uso CFDI">{toDisplayValue(quote.uso_cfdi)}</DetailRow>
            <DetailRow label="Forma de pago">{toDisplayValue(quote.forma_pago)}</DetailRow>
            <DetailRow label="Método de pago">{toDisplayValue(quote.metodo_pago)}</DetailRow>
            <DetailRow label="Moneda">{toDisplayValue(currencyLabel)}</DetailRow>
            <DetailRow label="Orden de compra">{toDisplayValue(quote.oc)}</DetailRow>
            <DetailRow label="Persona de pagos">{toDisplayValue(quote.persona_pagos)}</DetailRow>
            <DetailRow label="Correo de facturas">
              <span className="break-all">{toDisplayValue(quote.correo_facturas)}</span>
            </DetailRow>
            <DetailRow label="Teléfono de pagos">{toDisplayValue(quote.telefono_pagos)}</DetailRow>
            <DetailRow label="ID cliente">{toDisplayValue(quote.cliente)}</DetailRow>
          </DetailGroup>

          <DetailGroup title="Servicios y cargos">
            {quote.servicios_extras.length > 0 ? (
              quote.servicios_extras.map((servicio) => {
                const total = Number(servicio.cantidad) * Number(servicio.monto);
                return (
                  <div key={servicio.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="text-[13px] font-medium text-slate-800 dark:text-slate-100 min-w-0 truncate">
                      {servicio.nombre}
                    </p>
                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap tabular-nums">
                        {servicio.cantidad} × {formatAmount(servicio.monto)}
                      </span>
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">
                        {formatAmount(total)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-4 py-2.5 text-[13px] text-slate-400 dark:text-slate-500">Sin servicios extras</p>
            )}
          </DetailGroup>
        </div>

        <div className="space-y-5 min-w-0">
          <DetailGroup title="Importes">
            <DetailRow label="Subtotal">
              <span className="tabular-nums">{formatAmount(quote.subtotal)}</span>
            </DetailRow>
            <DetailRow label={`IVA ${toDisplayValue(quote.iva)}%`}>
              {/* Sin `importe_iva` (oculto o no enviado) queda solo la tasa. */}
              <span className="tabular-nums">{quote.importe_iva ? formatAmount(quote.importe_iva) : "—"}</span>
            </DetailRow>
            <DetailRow label="Anticipo">
              <span className="tabular-nums">{formatAmount(quote.anticipo)}</span>
            </DetailRow>
            <DetailRow label="Total" strong>
              <span className="tabular-nums">{formatAmount(quote.gran_total)}</span>
            </DetailRow>
            <DetailRow label="Autorizada">{toDisplayValue(formatQuoteDateTime(quote.autorizada_at))}</DetailRow>
            <div className="px-4 py-2.5">
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-2">Condición de pago</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {condiciones.map((condicion) => (
                  <span
                    key={condicion}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                  >
                    {condicion}
                  </span>
                ))}
                <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                  Monto{" "}
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                    {formatAmount(quote.monto)}
                  </span>
                </span>
              </div>
            </div>
          </DetailGroup>

          <DetailGroup title="Envío">
            <DetailRow label="Destinatario">{toDisplayValue(quote.destinatario)}</DetailRow>
            <DetailRow label="Empresa">{toDisplayValue(quote.empresa_envio)}</DetailRow>
            <DetailRow label="Teléfono">{toDisplayValue(quote.telefono_envio)}</DetailRow>
            <DetailRow label="Celular">{toDisplayValue(quote.celular_envio)}</DetailRow>
            <DetailRow label="Dirección">{toDisplayValue(quote.direccion_envio)}</DetailRow>
            <DetailRow label="Colonia">{toDisplayValue(quote.colonia_envio)}</DetailRow>
            <DetailRow label="C.P.">{toDisplayValue(quote.codigo_postal)}</DetailRow>
            <DetailRow label="Ciudad / Estado">
              {[quote.ciudad_envio, quote.estado_envio].filter(Boolean).join(", ") || "—"}
            </DetailRow>
            <DetailRow label="Referencias">{toDisplayValue(quote.referencias)}</DetailRow>
          </DetailGroup>
        </div>
      </div>

      {/* ── Productos ────────────────────────────────────────────────────── */}
      <DetailGroup title="Detalle de productos">
        <div className="p-4">
          <QuoteDetailsProducts details={quote.detalles} formatAmount={formatAmount} />
        </div>
      </DetailGroup>
    </div>
  );
};
