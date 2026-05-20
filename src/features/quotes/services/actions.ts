import { v1_api } from "@/src/api/v1.api";
import { Quote, QuoteById, QuoteCreate, QuoteOnboardingData } from "../interfaces/quote.interface";


export const getQuotes = async (): Promise<Quote[]> => {
  const response = await v1_api.get<Quote[]>("/ventas/cotizaciones/");
  return response.data;
};

export const getQuoteById = async (id: number): Promise<QuoteById> => {
  const response = await v1_api.get<QuoteById>(`/ventas/cotizaciones/${id}/`);
  return response.data;
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