import { v1_api } from "@/src/api/v1.api";
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityListResponse,
  OpportunityPatch,
} from "../interfaces/opportunity.interface";
import type {
  OpportunityCotizarResponse,
  OpportunityOnboarding,
} from "../interfaces/opportunity-onboarding.interface";

/**
 * Listado paginado en el servidor (`limit`/`offset`). `params` llega ya
 * validado de `useServerTable`: filtros (`estado`, `cliente`, `vendedor`),
 * búsqueda (`q`), `ordering` y la paginación.
 */
export const getOpportunities = async (
  params: Record<string, string | number>
): Promise<OpportunityListResponse> => {
  const { data } = await v1_api.get<OpportunityListResponse>("/ventas/oportunidades/", { params });
  return data;
};

export const createOpportunity = async (opportunity: OpportunityCreate): Promise<Opportunity> => {
  const { data } = await v1_api.post<Opportunity>("/ventas/oportunidades/", opportunity);
  return data;
};

/** PATCH: el endpoint no acepta PUT (405). */
export const updateOpportunity = async (id: number, changes: OpportunityPatch): Promise<Opportunity> => {
  const { data } = await v1_api.patch<Opportunity>(`/ventas/oportunidades/${id}/`, changes);
  return data;
};

/** Baja lógica: responde 204 y el registro deja de aparecer (su detalle da 404). */
export const deleteOpportunity = async (id: number): Promise<void> => {
  await v1_api.delete(`/ventas/oportunidades/${id}/`);
};

/**
 * Detalle de una oportunidad en una sola llamada: sus datos, sus cotizaciones
 * (con su pedido) y la cartera del cliente. 404 si no existe o no es visible
 * para el usuario.
 */
export const getOpportunityOnboarding = async (id: number): Promise<OpportunityOnboarding> => {
  const { data } = await v1_api.get<OpportunityOnboarding>(`/ventas/oportunidades/${id}/onboarding/`);
  return data;
};

/**
 * Crea una cotización en Borrador ligada a la oportunidad (201). Sin cuerpo:
 * empresa y cliente salen de la oportunidad y el vendedor es quien la ejecuta.
 * NO es idempotente: cada llamada crea otra cotización.
 */
export const cotizarOpportunity = async (id: number): Promise<OpportunityCotizarResponse> => {
  const { data } = await v1_api.post<OpportunityCotizarResponse>(
    `/ventas/oportunidades/${id}/cotizar/`
  );
  return data;
};
