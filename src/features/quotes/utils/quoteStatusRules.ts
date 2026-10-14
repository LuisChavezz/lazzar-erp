// ─── Reglas compartidas de estatus para cotizaciones ─────────────────────────

import { TIPO_PEDIDO } from "../../orders/constants/pedidoStatus";

// 4 (rechazada) se edita para corregir lo que pidió mesa de control. Guardar
// por `onboarding/` la devuelve a 1 (Borrador) en el backend, y desde 1 el
// reenvío ya no guarda comentario: es el contrato, no un fallo.
const EDITABLE_QUOTE_STATUSES = new Set([1, 3, 4]);
// 4 (rechazada) vuelve a revisión directamente, con un comentario opcional
// para mesa de control (ver `acceptsResendComment`).
const REVIEWABLE_QUOTE_STATUSES = new Set([1, 4]);
const REJECTED_QUOTE_STATUS = 4;
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

/**
 * ¿El reenvío a revisión admite un comentario? Solo desde estatus 4: es el
 * único caso en que `enviar-revision/` lo guarda (desde 1 o 5 lo ignora), así
 * que solo ahí se ofrece el campo.
 */
export const acceptsResendComment = (status: number | null | undefined): boolean =>
  status === REJECTED_QUOTE_STATUS;

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