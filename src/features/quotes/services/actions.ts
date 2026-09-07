import { isAxiosError } from "axios";
import { v1_api } from "@/src/api/v1.api";
import { Quote, QuoteById, QuoteCreate, QuoteOnboardingData, QuoteQueryParams } from "../interfaces/quote.interface";


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
export const getQuoteDetailById = async (
  id: number,
  source: QuoteDetailSource = "cotizaciones"
): Promise<QuoteById> => {
  try {
    return await QUOTE_DETAIL_READERS[source](id);
  } catch (error) {
    if (!isAxiosError(error) || error.response?.status !== 404) throw error;
    return QUOTE_DETAIL_READERS[OTHER_QUOTE_DETAIL_SOURCE[source]](id);
  }
};

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

// ─── Envía la cotización a revisión (Borrador → Por Autorizar) ─────────────────
export const submitQuoteForReview = async (id: number): Promise<Quote> => {
  const response = await v1_api.post<Quote>(`/ventas/cotizaciones/${id}/enviar-revision/`);
  return response.data;
};