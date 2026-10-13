import type { Opportunity } from "../interfaces/opportunity.interface";

/**
 * ÚNICA regla para nombrar una oportunidad con una sola etiqueta: su título; si
 * no tiene, su cliente; si no, su contacto; y si no hay nada, "Oportunidad
 * #<id>". La usan el listado, el detalle, las recientes y los diálogos.
 *
 * `isTitulo` distingue el título real de un nombre DERIVADO, que se pinta
 * atenuado y en cursiva para que no parezca un título (`OpportunityName`).
 */
export const getOpportunityLabel = (
  opportunity: Opportunity
): { text: string; isTitulo: boolean } => {
  const titulo = opportunity.titulo?.trim();
  if (titulo) return { text: titulo, isTitulo: true };
  return {
    text: getOpportunityWho(opportunity) ?? `Oportunidad #${opportunity.id}`,
    isTitulo: false,
  };
};

/** La etiqueta como texto plano (un nombre accesible, un subtítulo). */
export const getOpportunityName = (opportunity: Opportunity): string =>
  getOpportunityLabel(opportunity).text;

/**
 * La misma regla dentro de una FRASE ("¿Dar de baja la oportunidad …?"): el
 * título entre comillas, "de <cliente o contacto>", o "#<id>".
 */
export const describeOpportunity = (opportunity: Opportunity): string => {
  const { text, isTitulo } = getOpportunityLabel(opportunity);
  if (isTitulo) return `"${text}"`;
  const quien = getOpportunityWho(opportunity);
  return quien ? `de ${quien}` : `#${opportunity.id}`;
};

/** De quién es una oportunidad sin título: su cliente o, si no tiene, su contacto. */
const getOpportunityWho = (opportunity: Opportunity): string | undefined =>
  opportunity.cliente_nombre?.trim() || opportunity.nombre_contacto?.trim() || undefined;
