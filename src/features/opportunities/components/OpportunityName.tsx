import type { Opportunity } from "../interfaces/opportunity.interface";
import { getOpportunityLabel } from "../utils/describeOpportunity";

/**
 * El nombre de una oportunidad (`getOpportunityLabel`). Cuando no es su título
 * sino un nombre derivado (cliente, contacto o "#id"), va atenuado y en
 * cursiva, con "Sin título" como `title`.
 */
export const OpportunityName = ({ opportunity }: { opportunity: Opportunity }) => {
  const { text, isTitulo } = getOpportunityLabel(opportunity);
  if (isTitulo) return <>{text}</>;
  return (
    <span className="italic font-medium text-slate-400 dark:text-slate-500" title="Sin título">
      {text}
    </span>
  );
};
