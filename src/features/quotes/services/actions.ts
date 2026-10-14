import { isAxiosError } from "axios";
import { v1_api } from "@/src/api/v1.api";
import {
  Quote,
  QuoteById,
  QuoteComentario,
  QuoteCreate,
  QuoteOnboardingData,
  QuoteQueryParams,
  QuoteSubmitForReviewResponse,
} from "../interfaces/quote.interface";


export const getQuotes = async (params?: QuoteQueryParams): Promise<Quote[]> => {
  const response = await v1_api.get<Quote[]>("/ventas/cotizaciones/", { params });
  return response.data;
};

export const getQuoteById = async (id: number): Promise<QuoteById> => {
  const response = await v1_api.get<QuoteById>(`/ventas/cotizaciones/${id}/`);
  return response.data;
};

/**
 * Detalle de una cotización leído desde el recurso de Mesa de Control.
 *
 * Misma forma de respuesta que `getQuoteById`: `MesaControlViewSet` hereda
 * `retrieve` de `CotizacionViewSet` sin redefinirlo, así que ambas rutas
 * serializan con `CotizacionFullSerializer`. Lo único que cambia es el
 * queryset: `/ventas/cotizaciones/{id}/` filtra por `vendedor` para usuarios
 * no admin —404 para mesa de control, que casi nunca es el vendedor—, mientras
 * que `/ventas/mesa-control/{id}/` acota por empresa y estatus [2, 5].
 *
 * Existe aparte en lugar de reapuntar `getQuoteById` porque ese lo consumen
 * también la pestaña general de Cotizaciones, Ventas y el detalle de pedido,
 * donde el alcance de mesa de control (solo estatus 2 y 5) escondería registros.
 */
export const getMesaControlQuoteById = async (
  id: number
): Promise<QuoteById> => {
  const response = await v1_api.get<QuoteById>(`/ventas/mesa-control/${id}/`);
  return response.data;
};

/** Recurso por el que se pregunta primero al leer el detalle. */
export type QuoteDetailSource = "cotizaciones" | "mesa-control";

const QUOTE_DETAIL_READERS: Record<
  QuoteDetailSource,
  (id: number) => Promise<QuoteById>
> = {
  cotizaciones: getQuoteById,
  "mesa-control": getMesaControlQuoteById,
};

const OTHER_QUOTE_DETAIL_SOURCE: Record<QuoteDetailSource, QuoteDetailSource> = {
  cotizaciones: "mesa-control",
  "mesa-control": "cotizaciones",
};

/**
 * Detalle de cotización con respaldo en el otro recurso ante un 404.
 *
 * Ninguna de las dos rutas cubre por sí sola a todos los que legítimamente ven
 * una cotización, y los alcances no se contienen entre sí:
 *
 * - `/ventas/cotizaciones/{id}/` filtra por `vendedor` para quien no es
 *   `is_admin_empresa` —404 para mesa de control sobre la cotización de otro—,
 *   pero no mira el estatus.
 * - `/ventas/mesa-control/{id}/` acota por empresa y estatus [2, 5] para TODOS,
 *   admins incluidos: en cuanto la cotización se autoriza (estatus 3) responde
 *   404 aunque quien pregunte sea admin y la viera sin problema por la otra.
 *
 * Por eso el `source` es solo el ORDEN en que se pregunta —el que acierta a la
 * primera en el caso común de cada pantalla—, no una elección excluyente. Solo
 * un 404 activa el respaldo: cualquier otro error (401, 403, 5xx) se propaga
 * tal cual, y si el respaldo también da 404 se propaga el segundo error, que es
 * la respuesta correcta —la cotización no existe o no es visible para nadie que
 * este usuario represente—. El costo es una petición extra únicamente en la
 * ruta de fallo.
 */
export const getQuoteDetailById = (
  id: number,
  source: QuoteDetailSource = "cotizaciones"
): Promise<QuoteById> => readWithSourceFallback(QUOTE_DETAIL_READERS, id, source);

/** Pregunta primero a `source` y, solo ante un 404, al otro recurso. */
async function readWithSourceFallback<T>(
  readers: Record<QuoteDetailSource, (id: number) => Promise<T>>,
  id: number,
  source: QuoteDetailSource
): Promise<T> {
  try {
    return await readers[source](id);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    return readers[OTHER_QUOTE_DETAIL_SOURCE[source]](id);
  }
}

const QUOTE_COMENTARIOS_READERS: Record<
  QuoteDetailSource,
  (id: number) => Promise<QuoteComentario[]>
> = {
  cotizaciones: async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/cotizaciones/${id}/comentarios/`)).data,
  "mesa-control": async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/mesa-control/${id}/comentarios/`)).data,
};

/**
 * Historial de rechazos y reenvíos, en orden cronológico. Mismos alcances que
 * el detalle —`/mesa-control/{id}/comentarios/` solo responde en estatus 2 y 5;
 * `/cotizaciones/{id}/comentarios/` filtra por vendedor—, así que usa el mismo
 * respaldo ante un 404 que `getQuoteDetailById`.
 */
export const getQuoteComentarios = (
  id: number,
  source: QuoteDetailSource = "cotizaciones"
): Promise<QuoteComentario[]> => readWithSourceFallback(QUOTE_COMENTARIOS_READERS, id, source);

export const createQuote = async (quote: QuoteCreate): Promise<QuoteCreate> => {
  const response = await v1_api.post<QuoteCreate>("/ventas/cotizaciones/onboarding/", quote);
  return response.data;
};

export const getQuoteOnboardingData = async (): Promise<QuoteOnboardingData> => {
  const response = await v1_api.get<QuoteOnboardingData>("/ventas/cotizaciones/onboarding/");
  return response.data;
};

export const updateQuoteStatus = async (id: number, estatus: number): Promise<QuoteById> => {
  const response = await v1_api.patch<QuoteById>(`/ventas/cotizaciones/${id}/`, { estatus });
  return response.data;
};

export const updateQuote = async (cotizacion_id: number, quote: Partial<QuoteCreate>): Promise<QuoteById> => {
  const response = await v1_api.post<QuoteById>(`/ventas/cotizaciones/onboarding/`, { ...quote, cotizacion_id });
  return response.data;
};

// ─── Envía la cotización a revisión (Borrador/Rechazada → Por Autorizar) ──────
/**
 * `comentario` es OPCIONAL: el backend solo lo guarda (entrada `REENVIO` del
 * historial) si la cotización está en estatus 4; desde 1 o 5 lo ignora. Por
 * eso solo se manda cuando hay texto, y sin él la petición va sin cuerpo,
 * exactamente como antes.
 */
export const submitQuoteForReview = async (
  id: number,
  comentario?: string
): Promise<QuoteSubmitForReviewResponse> => {
  const response = await v1_api.post<QuoteSubmitForReviewResponse>(
    `/ventas/cotizaciones/${id}/enviar-revision/`,
    comentario ? { comentario } : undefined
  );
  return response.data;
};