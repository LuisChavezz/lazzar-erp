import type { QuoteById } from "../interfaces/quote.interface";
import { getQuoteDetailProductName } from "./quoteDetailsFormatters";
import { buildQuoteEmailTemplateModel, getQuoteDetailSkuSummary } from "./quoteEmailTemplateHelpers";
import { buildQuotePdfModel } from "./quotePdfTemplateHelpers";

/**
 * Lo que se RENDERIZA del correo de una cotización y de su PDF adjunto, para
 * que el envío compare la versión confirmada con la recién leída
 * (`assertEmailSnapshotUnchanged`) sin abortar por cambios que no se ven.
 *
 * - `pdf` / `email`: las salidas de `buildQuotePdfModel` y
 *   `buildQuoteEmailTemplateModel`, sin `detailRows` (traen el renglón crudo)
 *   ni `formatMoney` (es una función: la moneda va en `monedaCodigo`).
 * - `rows`: lo que `QuotePdfDocument` y `QuoteEmail` pintan de cada renglón.
 * - `quote`: los campos que leen DIRECTAMENTE `QuotePdfDocument`, `QuoteEmail`
 *   y el asunto (`buildQuoteEmailSubject`, que usa `cliente` de respaldo). De
 *   `correo_facturas` salen también los destinatarios.
 */
export const quoteEmailRenderInputs = (quote: QuoteById, monedaCodigo: string | null) => {
  const pdf = buildQuotePdfModel(quote, monedaCodigo);
  const email = buildQuoteEmailTemplateModel(quote);

  return {
    monedaCodigo,
    pdf: {
      customerName: pdf.customerName,
      formattedDate: pdf.formattedDate,
      totalPieces: pdf.totalPieces,
      shippingAddress: pdf.shippingAddress,
      skuSummaries: pdf.skuSummaries,
      computedSubtotal: pdf.computedSubtotal,
      detailAddons: pdf.detailAddons,
    },
    email: {
      customerName: email.customerName,
      totalPieces: email.totalPieces,
      shippingAddress: email.shippingAddress,
      computedSubtotal: email.computedSubtotal,
      detailAddons: email.detailAddons,
    },
    rows: pdf.detailRows.map(({ detail, quantity, lineSubtotal }) => ({
      id: detail.id,
      productName: getQuoteDetailProductName(detail),
      skuSummary: getQuoteDetailSkuSummary(detail),
      precioUnitario: detail.precio_unitario,
      quantity,
      lineSubtotal,
    })),
    quote: {
      id: quote.id,
      cliente: quote.cliente,
      cliente_nombre: quote.cliente_nombre,
      cliente_razon_social: quote.cliente_razon_social,
      correo_facturas: quote.correo_facturas,
      estatus_label: quote.estatus_label,
      created_at: quote.created_at,
      destinatario: quote.destinatario,
      persona_pagos: quote.persona_pagos,
      forma_pago: quote.forma_pago,
      metodo_pago: quote.metodo_pago,
      uso_cfdi: quote.uso_cfdi,
      oc: quote.oc,
      iva: quote.iva,
      anticipo: quote.anticipo,
      gran_total: quote.gran_total,
      observaciones: quote.observaciones,
    },
  };
};
