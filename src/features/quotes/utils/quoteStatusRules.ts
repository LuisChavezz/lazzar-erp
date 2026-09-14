// ─── Reglas compartidas de estatus para cotizaciones ─────────────────────────

import { TIPO_PEDIDO } from "../../orders/constants/pedidoStatus";

const EDITABLE_QUOTE_STATUSES = new Set([1, 3]);
const REVIEWABLE_QUOTE_STATUSES = new Set([1]);
const AUTHORIZABLE_QUOTE_STATUSES = new Set([2, 5]);
const CHANGES_REQUESTED_QUOTE_STATUSES = new Set([5]);

export const canEditQuote = (status: number | null | undefined): boolean => {
  return typeof status === "number" && EDITABLE_QUOTE_STATUSES.has(status);
};

/**
 * ¿Esta cotización lleva productos de muestra? Se lee del `tipo_pedido`
 * PERSISTIDO, no re-escaneando los detalles: el alta lo deriva y lo guarda.
 */
export const isMuestraQuote = (
  tipoPedido: number | null | undefined
): boolean => tipoPedido === TIPO_PEDIDO.MUESTRA;

/**
 * ¿Esta cotización puede enviarse a revisión? Depende solo del estatus: las de
 * muestra van a revisión igual que las de venta. Vive aquí y no en el
 * componente para que ninguna regla de estatus se duplique fuera.
 */
export const isQuoteReviewableStatus = (
  status: number | null | undefined
): boolean => typeof status === "number" && REVIEWABLE_QUOTE_STATUSES.has(status);

export const canManageQuoteAuthorization = (
  status: number | null | undefined
): boolean => {
  return typeof status === "number" && AUTHORIZABLE_QUOTE_STATUSES.has(status);
};

export const canAcceptQuoteChanges = (
  status: number | null | undefined
): boolean => {
  return (
    typeof status === "number" && CHANGES_REQUESTED_QUOTE_STATUSES.has(status)
  );
};