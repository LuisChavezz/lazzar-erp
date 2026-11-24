import { AxiosError } from "axios";
import { drfActionErrorMessage, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { PEDIDO_ESTATUS } from "../constants/pedidoStatus";
import type { PedidoListItem, PedidoRetencion } from "../interfaces/order.interface";
import { isMesaControlPermisoError } from "./pedidoProgramarErrors";

/**
 * Reglas puras de la retención de Mesa de Control (`retener/` y `liberar/`,
 * nucleo-erp#1352): qué acción se ofrece, qué campos escribe su resultado en
 * caché y qué texto lleva un fallo. Sin React ni `QueryClient`, para probarlas
 * solas.
 */

/** Lo que las reglas leen de un pedido: sirve una fila del listado o el detalle. */
export interface PedidoRetencionState {
  estatus: number;
  /** Ausente (backend anterior) = no retenido. */
  retenido?: boolean;
}

/** ¿El pedido está retenido? Una bandera ausente cuenta como no retenido. */
export const isPedidoRetenido = (pedido: Pick<PedidoRetencionState, "retenido">): boolean =>
  pedido.retenido === true;

/**
 * Acción de retención que aplica al pedido: `"retener"` si no está retenido,
 * `"liberar"` si lo está, y ninguna en un pedido cancelado (el backend lo da
 * de baja y ambas responden 404). Solo una a la vez. El permiso (Mesa de
 * Control) lo decide quien llama.
 */
export const pedidoRetencionAction = (
  pedido: PedidoRetencionState,
): "retener" | "liberar" | null => {
  if (pedido.estatus === PEDIDO_ESTATUS.CANCELADO) return null;
  return isPedidoRetenido(pedido) ? "liberar" : "retener";
};

/** Campos de retención que trae la fila del listado (`PedidoListSerializer`). */
export const PEDIDO_RETENCION_LIST_FIELDS = [
  "retenido",
  "motivo_retencion",
] as const satisfies readonly (keyof PedidoListItem)[];

/** Campos de retención del detalle y de la respuesta de `retener/`/`liberar/`. */
export const PEDIDO_RETENCION_DETAIL_FIELDS = [
  "retenido",
  "motivo_retencion",
  "fecha_retencion",
  "retenido_por",
  "retenido_por_nombre",
] as const satisfies readonly (keyof PedidoRetencion)[];

/**
 * Texto del 400 de `permiso` (`_require_mesa_control`): llega como 400, no 403.
 * Se muestra este en vez del del backend.
 */
export const PEDIDO_RETENCION_PERMISO_MESSAGE =
  "No tienes permiso para retener o liberar pedidos. Esta acción es exclusiva de Mesa de Control.";

/** 404: el pedido es de otra empresa o sucursal, o se canceló mientras tanto. */
export const PEDIDO_RETENCION_NOT_FOUND_MESSAGE =
  "El pedido ya no está disponible; puede que se haya cancelado.";

const FALLBACK_MESSAGES = {
  retener: "No se pudo retener el pedido. Intenta de nuevo.",
  liberar: "No se pudo liberar el pedido. Intenta de nuevo.",
} as const;

/**
 * Mensaje del toast de un fallo de `retener/` o `liberar/`: el texto fijo de
 * permiso, el del 404, o el del backend (`pedido`, `motivo`) tal cual; red y
 * 5xx caen al genérico de la acción.
 */
export const pedidoRetencionErrorMessage = (
  error: unknown,
  action: "retener" | "liberar",
): string => {
  if (isMesaControlPermisoError(error)) return PEDIDO_RETENCION_PERMISO_MESSAGE;
  return drfActionErrorMessage(error, FALLBACK_MESSAGES[action], PEDIDO_RETENCION_NOT_FOUND_MESSAGE);
};

/**
 * ¿El fallo dice que lo que se veía estaba desactualizado? Un 404 (pedido
 * cancelado o fuera de alcance) o el 400 `pedido` ("ya está retenido" / "no
 * está retenido": otra sesión se adelantó). Entonces se releen el listado y el
 * detalle para que dejen de ofrecer la acción equivocada.
 */
export const isStalePedidoRetencionError = (error: unknown): boolean =>
  isNotFoundError(error) ||
  (error instanceof AxiosError &&
    error.response?.status === 400 &&
    drfFieldMessage(error, "pedido") !== undefined);
