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

/** Uno de los dos recursos que sirven una cotización por id. */
type QuoteResource = "cotizaciones" | "mesa-control";

/**
 * Cómo se lee una cotización por id. Cada pantalla declara el suyo; no hay
 * valor por omisión, para que ninguna caiga en el respaldo sin pedirlo.
 *
 * - `"cotizaciones"`: `/ventas/cotizaciones/{id}/` —su empresa a cualquier
 *   estatus para `is_admin_empresa`/superuser; para los demás solo las que
 *   vendieron—. Es la de Ventas, la edición, el buscador global y las
 *   notificaciones que llegan al vendedor o a un admin.
 * - `"mesa-control"`: `/ventas/mesa-control/{id}/` —empresa y estatus [2, 5]
 *   para admins y el departamento de mesa de control; nada para los demás—.
 *   Es la de las vistas de Mesa de Control, cuyas filas salen de ese alcance.
 * - `"cotizaciones-o-mesa-control"`: la primera y, SOLO ante un 404, la
 *   segunda. Exclusiva del pedido 360°, que abre la cotización de un pedido
 *   para lectores de varios módulos sin que el front sepa cuál de los dos
 *   alcances le toca a cada uno (la pertenencia a mesa de control es un
 *   departamento, no viaja en la sesión). Se retira con EC-787, la lectura de
 *   la cotización con el alcance del pedido.
 */
export type QuoteDetailSource = QuoteResource | "cotizaciones-o-mesa-control";

type QuoteResourceReaders<T> = Record<QuoteResource, (id: number) => Promise<T>>;

/**
 * Lee del recurso que pide `source`. Con `"cotizaciones-o-mesa-control"`, solo
 * un 404 de la primera activa la segunda: cualquier otro error (401, 403, 5xx)
 * se propaga tal cual, y si la segunda también da 404 se propaga ese error.
 */
async function readQuoteResource<T>(
  readers: QuoteResourceReaders<T>,
  id: number,
  source: QuoteDetailSource
): Promise<T> {
  if (source !== "cotizaciones-o-mesa-control") return readers[source](id);
  try {
    return await readers.cotizaciones(id);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    return readers["mesa-control"](id);
  }
}

const QUOTE_DETAIL_READERS: QuoteResourceReaders<QuoteById> = {
  cotizaciones: getQuoteById,
  "mesa-control": getMesaControlQuoteById,
};

/** Detalle de cotización por el recurso que declara la pantalla (ver `QuoteDetailSource`). */
export const getQuoteDetailById = (
  id: number,
  source: QuoteDetailSource
): Promise<QuoteById> => readQuoteResource(QUOTE_DETAIL_READERS, id, source);

const QUOTE_COMENTARIOS_READERS: QuoteResourceReaders<QuoteComentario[]> = {
  cotizaciones: async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/cotizaciones/${id}/comentarios/`)).data,
  "mesa-control": async (id) =>
    (await v1_api.get<QuoteComentario[]>(`/ventas/mesa-control/${id}/comentarios/`)).data,
};

/**
 * Historial de rechazos y reenvíos, en orden cronológico. Mismos alcances que
 * el detalle, así que se lee con el MISMO `source` que el detalle al que
 * acompaña (`QuoteDetails` pasa el suyo a los dos).
 */
export const getQuoteComentarios = (
  id: number,
  source: QuoteDetailSource
): Promise<QuoteComentario[]> => readQuoteResource(QUOTE_COMENTARIOS_READERS, id, source);

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