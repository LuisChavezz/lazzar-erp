/**
 * Parser server-side del body del endpoint de envio.
 *
 * Este modulo solo interpreta la solicitud HTTP y no conoce reglas de negocio
 * como prioridad de destinatarios o render del correo.
 */
import { EmailValidationError, normalizeEmail } from "@/src/utils/email/emailAddress";

export type SendQuoteEmailRequest = {
  to?: string;
};

/**
 * Lee el body, valida que sea JSON cuando exista y normaliza el campo `to`.
 * Un body vacio es valido porque el destinatario puede resolverse desde la cotizacion.
 */
export const parseSendQuoteEmailRequest = async (request: Request): Promise<SendQuoteEmailRequest> => {
  const rawBody = await request.text();

  if (!rawBody) {
    return {};
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody) as unknown;
  } catch {
    // JSON invalido es un error de entrada del cliente, no un fallo interno del servidor.
    throw new EmailValidationError("El cuerpo de la solicitud no es un JSON valido.");
  }

  if (!parsedBody || typeof parsedBody !== "object") {
    return {};
  }

  const { to } = parsedBody as { to?: unknown };

  return {
    // Solo se acepta string; cualquier otro tipo se ignora para mantener el contrato tolerante.
    to: typeof to === "string" ? normalizeEmail(to) : undefined,
  };
};
