import {
  cancelErrorClosesDialog,
  classifyCancelError,
  isRetryableCancelMessage,
  type CancelError,
} from "@/src/features/document-cancellation/utils/cancelErrors";

/**
 * Llaves con que las cancelaciones de WMS rechazan la acción por una regla de
 * negocio (nucleo-erp `cancelacion_service`, #1348 y EC-949): ya cancelado,
 * orden de cancelación (despacho → packing → picking), órdenes de trabajo vivas,
 * cadena de TR del surtido, pedido que ya no existe (`pedido`, nucleo-erp#1370).
 * Reintentar igual no sirve, salvo el cambio concurrente, que pide reintentar
 * (`isRetryableWmsCancelMessage`).
 */
const BLOCKING_KEYS = ["despacho", "packing", "picking", "transferencia", "pedido"] as const;

/**
 * Un `400` de negocio que SÍ puede salir al reintentar: el backend lo dice en el
 * texto ("Intenta de nuevo", EC-949, cuando otro proceso cambió la TR mientras
 * se revertía). La regla es la de toda cancelación con motivo
 * (`isRetryableCancelMessage`).
 */
export const isRetryableWmsCancelMessage = isRetryableCancelMessage;

export const WMS_CANCEL_NOT_FOUND_MESSAGE = "El documento ya no está disponible o no tienes acceso a él.";
export const WMS_CANCEL_FORBIDDEN_MESSAGE = "No tienes permiso para cancelar documentos de almacén.";

/**
 * Qué hacer con un error de `cancelar/` o `revertir/` (EC-945): la forma
 * genérica (`CancelError`, ver `classifyCancelError`) con las llaves y los
 * textos de WMS.
 * - `motivo`: bajo el campo; el diálogo sigue abierto.
 * - `blocked`: un `400` con la llave del documento, o con la LISTA plana de
 *   `revertir/` sin stock en el destino (`["Inventario insuficiente …"]`).
 *   Toast con el mensaje tal cual, se cierra el diálogo y se relee todo.
 * - `retryable`: un `400` con la llave del documento que pide reintentar.
 *   Toast tal cual, se relee todo y el diálogo sigue abierto con el motivo.
 * - `not-found` (`404`: otra empresa o sucursal): igual que `blocked`.
 * - `forbidden` (`403`): toast con su `detail` tal cual; sigue abierto.
 * - `other` (red, 5xx, otro `400`): toast; sigue abierto con el motivo escrito.
 */
export type WmsCancelError = CancelError;

/**
 * `extraBlockingKeys` (opcional, EC-947): llaves de `400` de negocio propias de
 * una acción, además de las de WMS (p. ej. la reversa de calidad: `existencia`,
 * `orden_compra`…). Sin ellas, el comportamiento es el de siempre.
 */
export const classifyWmsCancelError = (
  error: unknown,
  fallback: string,
  extraBlockingKeys: readonly string[] = [],
): WmsCancelError =>
  classifyCancelError(error, {
    blockingKeys: [...BLOCKING_KEYS, ...extraBlockingKeys],
    messages: {
      fallback,
      notFound: WMS_CANCEL_NOT_FOUND_MESSAGE,
      forbidden: WMS_CANCEL_FORBIDDEN_MESSAGE,
    },
  });

/** ¿El error cierra el diálogo? (el documento ya no se puede cancelar desde ahí). */
export const wmsCancelErrorClosesDialog = cancelErrorClosesDialog;
