/**
 * Respuesta esperada desde el endpoint interno de envio.
 * Se mantiene pequena porque el cliente solo necesita confirmar destinatario, asunto y messageId.
 */
export type SendQuoteEmailResponse = {
  ok: boolean;
  messageId?: string;
  recipient: string;
  subject: string;
};

/**
 * Cliente HTTP minimo para disparar el envio de una cotizacion.
 *
 * Responsabilidades:
 * - llamar al endpoint interno de Next.js
 * - intentar interpretar el JSON aunque falle el status HTTP
 * - normalizar errores para que hooks y UI reciban un `Error` consistente
 */
export const sendQuoteEmail = async (quoteId: number) => {
  const response = await fetch(`/api/quotes/${quoteId}/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json().catch(() => null)) as
    | (SendQuoteEmailResponse & { error?: string })
    | null;

  // Si el backend respondio con error, priorizamos el mensaje server-side para mostrarlo en UI.
  if (!response.ok) {
    throw new Error(data?.error || "No se pudo enviar el correo de la cotizacion.");
  }

  // Esta validacion protege al cliente frente a respuestas vacias o payloads inesperados.
  if (!data) {
    throw new Error("El servidor no devolvio una respuesta valida.");
  }

  return data;
};