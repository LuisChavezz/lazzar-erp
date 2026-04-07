/**
 * Servicio principal del caso de uso "enviar cotizacion por correo".
 *
 * Orquesta el flujo completo:
 * 1. Consulta la cotizacion.
 * 2. Resuelve destinatario y reply-to.
 * 3. Construye asunto y contenido.
 * 4. Ejecuta el envio mediante el transporter configurado.
 */
import type { QuoteById } from "../../interfaces/quote.interface";
import { getQuoteByIdServer } from "../server-actions";
import { getEmailFrom, getMailTransporter } from "@/src/lib/email";
import { EmailValidationError, getFirstValidEmail } from "@/src/utils/email/emailAddress";
import { buildQuoteEmailContent, buildQuoteEmailSubject } from "./quoteEmailContent.server";

/** Parametros minimos para ejecutar el envio del correo. */
type SendQuoteEmailParams = {
  quoteId: number;
  accessToken: string;
  requestedRecipient?: string;
};

/** Resultado que el endpoint devuelve al cliente tras un envio exitoso. */
export type SendQuoteEmailResult = {
  messageId: string;
  recipient: string;
  subject: string;
};

/**
 * Prioridad de destinatario:
 * 1. destinatario solicitado explicitamente
 * 2. correo de facturas del cliente
 */
const getQuoteRecipient = (quote: QuoteById, requestedRecipient?: string) =>
  getFirstValidEmail([requestedRecipient, quote.correo_facturas]);

/**
 * El reply-to usa el correo del cliente solo si pasa validacion.
 * Asi evitamos enviar cabeceras invalidas al proveedor SMTP.
 */
const getQuoteReplyTo = (quote: QuoteById) => getFirstValidEmail([quote.correo_facturas]);

export const sendQuoteEmail = async ({
  quoteId,
  accessToken,
  requestedRecipient,
}: SendQuoteEmailParams): Promise<SendQuoteEmailResult> => {
  // Paso 1: cargar la informacion completa de la cotizacion desde el backend principal.
  const quote = await getQuoteByIdServer(quoteId, accessToken);

  // Paso 2: resolver el destinatario final segun la politica definida del dominio.
  const recipient = getQuoteRecipient(quote, requestedRecipient);

  if (!recipient) {
    throw new EmailValidationError("El destinatario configurado no es valido.");
  }

  // Paso 3: construir asunto y contenido una sola vez antes de abrir el envio SMTP.
  const subject = buildQuoteEmailSubject(quote);
  const { html, text } = await buildQuoteEmailContent(quote);

  // Paso 4: obtener el transporter configurado y disparar el envio real.
  const transporter = getMailTransporter();
  const info = await transporter.sendMail({
    from: getEmailFrom(),
    to: recipient,
    subject,
    html,
    text,
    replyTo: getQuoteReplyTo(quote),
  });

  // El servicio devuelve solo lo que el cliente necesita conocer del envio realizado.
  return {
    messageId: info.messageId,
    recipient,
    subject,
  };
};
