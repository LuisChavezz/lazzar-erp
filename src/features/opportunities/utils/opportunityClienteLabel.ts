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
 * Texto de un cliente que el usuario no puede ver (EC-940). Nunca lleva el id:
 * "Cliente #<id>" delataba que el cliente existe y cuál es.
 */
export const CLIENTE_NO_VISIBLE_LABEL = "Cliente no visible";

/**
 * ¿El usuario NO puede ver al cliente de la oportunidad? El backend
 * (`ClienteVisibleMixin`) manda entonces el id en `cliente` y `cliente_nombre`
 * y `cliente_razon_social` en `null`. Un cliente visible siempre trae los dos
 * como texto (`Cliente.nombre` es obligatorio y la razón social puede venir
 * `""`, nunca `null`), así que la marca es `null` y no "vacío": un `""` es un
 * cliente visible en blanco. Un `cliente_nombre` ausente cuenta como oculto, para
 * fallar cerrado.
 */
export const isOpportunityClienteHidden = (opportunity: OpportunityClienteFields): boolean =>
  opportunity.cliente != null && opportunity.cliente_nombre == null;

/**
 * Nombre del cliente de una oportunidad con la convención de EC-810 (la misma
 * de cotizaciones): la razón social TAL CUAL llega; si viene en blanco, el
 * nombre del cliente; si los dos vienen en blanco, `Cliente #<id>`. Un cliente
 * que el usuario no ve es "Cliente no visible", sin id (EC-940). `null` si la
 * oportunidad no tiene cliente: cada pantalla decide qué pinta entonces (el
 * contacto capturado, "Sin cliente").
 *
 * Solo para Oportunidades: las cotizaciones nunca traen un cliente oculto y
 * siguen con `getQuoteClienteLabel`.
 */
export const getOpportunityClienteLabel = (
  opportunity: OpportunityClienteFields
): string | null => {
  if (opportunity.cliente == null) return null;
  if (isOpportunityClienteHidden(opportunity)) return CLIENTE_NO_VISIBLE_LABEL;
  return getQuoteClienteLabel(opportunity);
};

/**
 * Persona de contacto del cliente (`cliente_nombre`) para una línea secundaria
 * rotulada, o `null` cuando no aporta nada (sin cliente, oculto, igual a la
 * razón social o ya usado como etiqueta).
 */
export const getOpportunityClienteContacto = (
  opportunity: OpportunityClienteFields
): string | null =>
  isOpportunityClienteHidden(opportunity) ? null : getQuoteClienteContacto(opportunity);
