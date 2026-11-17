import {
  getQuoteClienteContacto,
  getQuoteClienteLabel,
} from "@/src/features/quotes/utils/quoteClienteLabel";
import type { Opportunity } from "../interfaces/opportunity.interface";

type OpportunityClienteFields = Pick<
  Opportunity,
  "cliente" | "cliente_nombre" | "cliente_razon_social"
>;

/**
 * Nombre del cliente de una oportunidad con la convención de EC-810 (la misma
 * de cotizaciones): la razón social TAL CUAL llega; si viene en blanco, el
 * nombre del cliente; y si el usuario no puede ver al cliente (el backend manda
 * los dos en `null`), `Cliente #<id>`. `null` si la oportunidad no tiene
 * cliente: cada pantalla decide qué pinta entonces (el contacto capturado,
 * "Sin cliente").
 */
export const getOpportunityClienteLabel = (
  opportunity: OpportunityClienteFields
): string | null =>
  opportunity.cliente == null ? null : getQuoteClienteLabel(opportunity);

/**
 * Persona de contacto del cliente (`cliente_nombre`) para una línea secundaria
 * rotulada, o `null` cuando no aporta nada (sin cliente, oculto, igual a la
 * razón social o ya usado como etiqueta).
 */
export const getOpportunityClienteContacto = (
  opportunity: OpportunityClienteFields
): string | null => getQuoteClienteContacto(opportunity);
