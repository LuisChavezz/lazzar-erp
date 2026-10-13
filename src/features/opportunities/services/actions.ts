import { v1_api } from "@/src/api/v1.api";
import type {
  Opportunity,
  OpportunityCreate,
  OpportunityListResponse,
  OpportunityPatch,
} from "../interfaces/opportunity.interface";

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
