import { v1_api } from "@/src/api/v1.api";
import {
  readQuoteResource,
  type QuoteDetailSource,
  type QuoteResource,
  type QuoteResourceRead,
  type QuoteResourceReaders,
} from "../utils/quoteResource";
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

export type { QuoteDetailSource, QuoteResource } from "../utils/quoteResource";

const QUOTE_DETAIL_READERS: QuoteResourceReaders<QuoteById> = {
  cotizaciones: getQuoteById,
  "mesa-control": getMesaControlQuoteById,
};

/**
 * Detalle de cotización por el recurso que declara la pantalla (ver
 * `QuoteDetailSource`), con el recurso que lo sirvió: los comentarios de esa
 * cotización se leen de ese mismo recurso.
 */
export const getQuoteDetailById = (
  id: number,
  source: QuoteDetailSource
): Promise<QuoteResourceRead<QuoteById>> =>
  readQuoteResource(QUOTE_DETAIL_READERS, id, source);

const QUOTE_COMENTARIOS_READERS: QuoteResourceReaders<QuoteComentario[]> = {
  cotizaciones: async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/cotizaciones/${id}/comentarios/`)).data,
  "mesa-control": async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/mesa-control/${id}/comentarios/`)).data,
};

/**
 * Historial de rechazos y reenvíos, en orden cronológico. Mismos alcances que
 * el detalle, así que se lee del recurso CONCRETO del detalle al que acompaña
 * —el fijo de su `source` o el que resolvió su respaldo—, nunca con un
 * respaldo propio: así detalle y comentarios no pueden divergir.
 */
export const getQuoteComentarios = (
  id: number,
  resource: QuoteResource
): Promise<QuoteComentario[]> => QUOTE_COMENTARIOS_READERS[resource](id);

export const createQuote = async (quote: QuoteCreate): Promise<QuoteCreate> => {
  const response = await v1_api.post<QuoteCreate>("/ventas/cotizaciones/onboarding/", quote);
  return response.data;
};

export const getQuoteOnboardingData = async (): Promise<QuoteOnboardingData> => {
  const response = await v1_api.get<QuoteOnboardingData>("/ventas/cotizaciones/onboarding/");
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