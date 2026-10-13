/** Listado de oportunidades. */
export const OPPORTUNITIES_LIST_PATH = "/sales/opportunities";

/** Detalle de una oportunidad (`/sales/opportunities/[id]`). */
export const opportunityDetailPath = (id: number) => `${OPPORTUNITIES_LIST_PATH}/${id}`;

/**
 * Parámetro de la URL del detalle con el estado del listado del que se llegó
 * (ver `utils/opportunityListQuery`). El detalle de pedido lo reenvía con el
 * mismo nombre cuando su origen es una oportunidad.
 */
export const OPPORTUNITY_LIST_PARAM = "lista";
