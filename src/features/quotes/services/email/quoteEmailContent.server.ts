/**
 * Construccion del contenido del correo.
 * Aqui solo se define como obtener asunto, HTML y texto plano a partir de una cotizacion.
 */
import { createElement } from "react";
import { render, toPlainText } from "@react-email/render";
import QuoteEmail from "@/src/emails/QuoteEmail";
import type { QuoteById } from "../../interfaces/quote.interface";

/**
 * Resuelve el nombre mas representativo del cliente para usarlo en asunto y contenido.
 */
const getQuoteCustomerName = (quote: QuoteById) =>
  quote.cliente_razon_social || quote.cliente_nombre || `cliente ${quote.cliente}`;

/**
 * Construye el asunto del correo a partir del identificador y nombre del cliente.
 */
export const buildQuoteEmailSubject = (quote: QuoteById) =>
  `Cotizacion #${quote.id} - ${getQuoteCustomerName(quote)}`;

/**
 * Renderiza la plantilla React Email a HTML y genera su equivalente en texto plano.
 * Esto permite compatibilidad con clientes de correo que prefieren texto sin formato.
 */
export const buildQuoteEmailContent = async (quote: QuoteById) => {
  const html = await render(createElement(QuoteEmail, { quote }));

  return {
    html,
    text: toPlainText(html),
  };
};
