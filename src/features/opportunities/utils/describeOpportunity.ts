import type { Opportunity } from "../interfaces/opportunity.interface";

/**
 * Nombre de una oportunidad para una celda o un enlace: su título o, si no
 * tiene, su contacto o su cliente (hay registros con solo uno de los tres).
 */
export const getOpportunityName = (opportunity: Opportunity): string =>
  opportunity.titulo?.trim() ||
  opportunity.nombre_contacto?.trim() ||
  opportunity.cliente_nombre?.trim() ||
  `Oportunidad #${opportunity.id}`;

/** Cómo nombrar una oportunidad en un texto: su título o, si no tiene, su contacto. */
export const describeOpportunity = (opportunity: Opportunity): string => {
  const titulo = opportunity.titulo?.trim();
  if (titulo) return `"${titulo}"`;
  const quien = opportunity.cliente_nombre ?? opportunity.nombre_contacto?.trim();
  return quien ? `de ${quien}` : `#${opportunity.id}`;
};
