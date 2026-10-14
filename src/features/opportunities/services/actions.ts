import { v1_api } from "@/src/api/v1.api";
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityListResponse,
  OpportunityPatch,
} from "../interfaces/opportunity.interface";
import type { OpportunityEmbudo } from "../interfaces/opportunity-embudo.interface";
import type {
  OpportunityCotizarResponse,
  OpportunityOnboarding,
} from "../interfaces/opportunity-onboarding.interface";
import type {
  OpportunitySeguimiento,
  SeguimientoCreate,
  SeguimientoPatch,
} from "../interfaces/seguimiento.interface";

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

/**
 * Embudo: cantidad y monto por estado. Acepta los filtros del listado
 * (`cliente`, `vendedor`, `q`, `estado`) e ignora orden y paginación.
 */
export const getOpportunitiesEmbudo = async (
  params: Record<string, string>
): Promise<OpportunityEmbudo> => {
  const { data } = await v1_api.get<OpportunityEmbudo>("/ventas/oportunidades/embudo/", { params });
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

/**
 * Pasa la oportunidad a otro vendedor de la misma empresa (solo un
 * administrador de empresa). Responde la oportunidad ya con su nuevo dueño.
 */
export const transferOpportunity = async (id: number, vendedor: number): Promise<Opportunity> => {
  const { data } = await v1_api.post<Opportunity>(`/ventas/oportunidades/${id}/transferir/`, {
    vendedor,
  });
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

// ── Seguimientos ────────────────────────────────────────────────────────────

const SEGUIMIENTOS_URL = "/ventas/oportunidad-seguimientos/";

/**
 * Todos los seguimientos de una oportunidad, del más nuevo al más viejo. Sin
 * `limit` el endpoint responde un arreglo plano, sin paginar.
 */
export const getOpportunitySeguimientos = async (
  opportunityId: number
): Promise<OpportunitySeguimiento[]> => {
  const { data } = await v1_api.get<OpportunitySeguimiento[]>(SEGUIMIENTOS_URL, {
    params: { oportunidad: opportunityId },
  });
  return data;
};

/** Alta de un seguimiento. El autor (`vendedor`) lo fija el backend. */
export const createSeguimiento = async (
  seguimiento: SeguimientoCreate
): Promise<OpportunitySeguimiento> => {
  const { data } = await v1_api.post<OpportunitySeguimiento>(SEGUIMIENTOS_URL, seguimiento);
  return data;
};

/** PATCH: el endpoint no acepta PUT (405). */
export const updateSeguimiento = async (
  id: number,
  changes: SeguimientoPatch
): Promise<OpportunitySeguimiento> => {
  const { data } = await v1_api.patch<OpportunitySeguimiento>(`${SEGUIMIENTOS_URL}${id}/`, changes);
  return data;
};

/** Borrado FÍSICO (204): el seguimiento desaparece, no hay cómo recuperarlo. */
export const deleteSeguimiento = async (id: number): Promise<void> => {
  await v1_api.delete(`${SEGUIMIENTOS_URL}${id}/`);
};

/** Marca el seguimiento como completado y le pone `completado_at`. Idempotente. */
export const completarSeguimiento = async (id: number): Promise<OpportunitySeguimiento> => {
  const { data } = await v1_api.post<OpportunitySeguimiento>(`${SEGUIMIENTOS_URL}${id}/completar/`);
  return data;
};

/** Reabre un seguimiento completado: el backend limpia `completado_at`. */
export const reabrirSeguimiento = async (id: number): Promise<OpportunitySeguimiento> => {
  const { data } = await v1_api.patch<OpportunitySeguimiento>(`${SEGUIMIENTOS_URL}${id}/`, {
    completado: false,
  });
  return data;
};
