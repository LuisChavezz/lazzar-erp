/**
 * Helpers server-side para consultar la cotizacion completa desde el backend externo.
 * Este modulo no conoce nada del envio de correo; solo resuelve acceso a datos.
 */
import type { QuoteById } from "../interfaces/quote.interface";

/**
 * Obtiene la URL base del API desde variables de entorno.
 * Se normaliza sin slash final para construir endpoints de forma segura.
 */
const getApiBaseUrl = () => {
  const apiBaseUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;

  if (!apiBaseUrl) {
    throw new Error("No se encontro la URL base del API para consultar cotizaciones.");
  }

  return apiBaseUrl.replace(/\/$/, "");
};

/**
 * Convierte una respuesta fallida del backend en un mensaje mas util.
 * Si el backend devuelve JSON con `detail` o `message`, se reutiliza ese texto.
 */
const getErrorMessage = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText) {
    return `Error ${response.status} al consultar la cotizacion.`;
  }

  try {
    const parsed = JSON.parse(responseText) as { detail?: string; message?: string };
    return parsed.detail || parsed.message || responseText;
  } catch {
    return responseText;
  }
};

/**
 * Recupera el detalle completo de una cotizacion reenviando las cookies de sesion del cliente.
 * El resultado se usa despues para construir el correo y resolver destinatarios.
 */
export const getQuoteByIdServer = async (quoteId: number, cookieHeader: string) => {
  const response = await fetch(`${getApiBaseUrl()}/ventas/cotizaciones/${quoteId}/`, {
    method: "GET",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  // Si el backend falla, elevamos un error ya normalizado para que capas superiores no repliquen parsing.
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as QuoteById;
};