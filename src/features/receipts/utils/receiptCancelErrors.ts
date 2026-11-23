import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";

/**
 * Llaves con que `cancelar/` dice que la recepción YA no puede cancelarse
 * (nucleo-erp `validar_cancelacion_recepcion`): ya cancelada o pasó por calidad,
 * OP completada, factura de proveedor viva. Reintentar no sirve.
 */
const BLOCKING_KEYS = ["estatus", "op", "facturas_proveedores"] as const;

export const RECEIPT_CANCEL_NOT_FOUND_MESSAGE = "La recepción ya no está disponible.";
export const RECEIPT_CANCEL_FALLBACK_MESSAGE = "Error al cancelar la recepción";

/**
 * Qué hacer con un error de `cancelar/` (EC-925):
 * - `motivo`: bajo el campo, el diálogo sigue abierto.
 * - `blocked` (`estatus`/`op`/`facturas_proveedores`) y `not-found` (404: otra
 *   empresa o dada de baja): toast, se cierra el diálogo y se relee el detalle.
 * - `other` (403 y el resto): toast con el mensaje del backend tal cual; el
 *   diálogo sigue abierto con el motivo escrito.
 *
 * Los 400 de este endpoint llegan como string plano (`{"motivo": "..."}`), no
 * como lista; `drfFieldMessage` acepta ambas formas.
 */
export type ReceiptCancelError =
  | { kind: "motivo"; message: string }
  | { kind: "blocked"; message: string }
  | { kind: "not-found"; message: string }
  | { kind: "other"; message: string };

export const classifyReceiptCancelError = (error: unknown): ReceiptCancelError => {
  if (isNotFoundError(error)) {
    return { kind: "not-found", message: RECEIPT_CANCEL_NOT_FOUND_MESSAGE };
  }
  const motivo = drfFieldMessage(error, "motivo");
  if (motivo) return { kind: "motivo", message: motivo };
  for (const key of BLOCKING_KEYS) {
    const message = drfFieldMessage(error, key);
    if (message) return { kind: "blocked", message };
  }
  return {
    kind: "other",
    message: firstDrfFieldMessage(error) ?? extractErrorMessage(error, RECEIPT_CANCEL_FALLBACK_MESSAGE),
  };
};

/** ¿El error cierra el diálogo? (la recepción ya no se puede cancelar desde ahí). */
export const receiptCancelErrorClosesDialog = (error: ReceiptCancelError): boolean =>
  error.kind === "blocked" || error.kind === "not-found";
