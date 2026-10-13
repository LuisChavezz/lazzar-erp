import type { Opportunity } from "../interfaces/opportunity.interface";

/** Cómo nombrar una oportunidad en un texto: su título o, si no tiene, su contacto. */
export const describeOpportunity = (opportunity: Opportunity): string => {
  const titulo = opportunity.titulo?.trim();
  if (titulo) return `"${titulo}"`;
  const quien = opportunity.cliente_nombre ?? opportunity.nombre_contacto?.trim();
  return quien ? `de ${quien}` : `#${opportunity.id}`;
};
