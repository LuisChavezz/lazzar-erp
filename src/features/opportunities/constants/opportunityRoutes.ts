/** Listado de oportunidades. */
export const OPPORTUNITIES_LIST_PATH = "/sales/opportunities";

/** Detalle de una oportunidad (`/sales/opportunities/[id]`). */
export const opportunityDetailPath = (id: number) => `${OPPORTUNITIES_LIST_PATH}/${id}`;
