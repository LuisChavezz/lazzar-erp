/**
 * Construccion del contenido del correo.
 * Aqui solo se define como obtener asunto, HTML y texto plano a partir de una cotizacion.
 */
import { createElement } from "react";
import { render, toPlainText } from "@react-email/render";
import QuoteEmail from "@/src/emails/QuoteEmail";
import type { QuoteById } from "../../interfaces/quote.interface";
import { getQuoteClienteLabel } from "../../utils/quoteClienteLabel";

/**
 * Construye el asunto del correo a partir del identificador y el nombre del
 * cliente con la convención única (`getQuoteClienteLabel`, EC-810). El cuerpo
 * sigue nombrando al contacto.
 */
export const buildQuoteEmailSubject = (quote: QuoteById) =>
  `Cotizacion #${quote.id} - ${getQuoteClienteLabel(quote)}`;

/**
 * Renderiza la plantilla React Email a HTML y genera su equivalente en texto plano.
 * Esto permite compatibilidad con clientes de correo que prefieren texto sin formato.
 *
 * `monedaCodigo` llega del cliente (este servidor no puede consultar el
 * catálogo de monedas); `null` pinta los importes sin símbolo.
 */
export const buildQuoteEmailContent = async (quote: QuoteById, monedaCodigo: string | null) => {
  const html = await render(createElement(QuoteEmail, { quote, monedaCodigo }));

  return {
    html,
    text: toPlainText(html),
  };
};
