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

/** Lo que el formulario sabe del cliente elegido en el catálogo. */
interface CatalogClienteFields {
  razon_social?: string | null;
  nombre?: string | null;
}

/**
 * Texto del cliente elegido en el formulario de oportunidad. `""` sin cliente.
 *
 * 1. En el catálogo: su razón social, o su nombre (EC-810). Un cliente del
 *    catálogo lo ve el usuario por definición, así que nunca es "no visible".
 * 2. Fuera del catálogo pero es el cliente de la oportunidad que se edita: la
 *    etiqueta de la celda, que da "Cliente no visible" si está oculto (EC-940).
 * 3. Cualquier otro: `Cliente #<id>`. Solo pudo elegirse del catálogo propio
 *    (que se recargó sin él, o no ha cargado), así que el id no delata nada.
 */
export const getSelectedOpportunityClienteLabel = (
  catalogCustomer: CatalogClienteFields | undefined,
  watchedCliente: number | null,
  opportunityToEdit: OpportunityClienteFields | null | undefined
): string => {
  if (watchedCliente === null) return "";
  if (catalogCustomer) {
    return getQuoteClienteLabel({
      cliente: watchedCliente,
      cliente_razon_social: catalogCustomer.razon_social ?? "",
      cliente_nombre: catalogCustomer.nombre ?? "",
    });
  }
  if (opportunityToEdit && watchedCliente === opportunityToEdit.cliente) {
    return getOpportunityClienteLabel(opportunityToEdit) ?? CLIENTE_NO_VISIBLE_LABEL;
  }
  return `Cliente #${watchedCliente}`;
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
