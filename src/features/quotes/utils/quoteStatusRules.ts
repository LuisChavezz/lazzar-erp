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
 * Motivo por el que una cotización de muestra no puede enviarse a revisión.
 * Compartido por los DOS caminos (menú de fila y arrastre del tablero) para que
 * el usuario lea lo mismo sin importar por dónde lo intente.
 */
export const MUESTRA_REVIEW_BLOCK_REASON =
  "Una cotización con productos de muestra permanece en Borrador.";

/**
 * ¿El ESTATUS por sí solo admitiría enviar a revisión? Sirve para decidir si la
 * acción se muestra (aunque salga deshabilitada por ser muestra). Vive aquí y no
 * en el componente para que ninguna regla de estatus se duplique fuera.
 */
export const isQuoteReviewableStatus = (
  status: number | null | undefined
): boolean => typeof status === "number" && REVIEWABLE_QUOTE_STATUSES.has(status);

/**
 * Regla ÚNICA de "esta cotización puede ir a revisión".
 *
 * `tipoPedido` es obligatorio a propósito: es la única forma de que el
 * compilador obligue a cualquier camino futuro a considerarlo. Una cotización
 * de MUESTRA queda fuera SIEMPRE, sin importar su estatus; para el resto la
 * regla es exactamente la de antes.
 */
export const canSubmitQuoteForReview = (
  status: number | null | undefined,
  tipoPedido: number | null | undefined
): boolean => {
  if (tipoPedido === TIPO_PEDIDO.MUESTRA) {
    return false;
  }
  return isQuoteReviewableStatus(status);
};

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