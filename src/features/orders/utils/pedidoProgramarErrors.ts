import { AxiosError } from "axios";
import { firstNonBlankRejectionMessage } from "@/src/utils/firstDrfMessage";

/**
 * `GET` y `PATCH /ventas/pedidos/{id}/programar/` exigen el rol de mesa de
 * control (`_require_mesa_control`): sin él responden **400** con
 * `{ "permiso": "..." }`, no 403. Se muestra este texto en lugar del del
 * backend o el genérico de Axios ("Request failed with status code 400").
 */
export const PEDIDO_PROGRAMAR_PERMISO_MESSAGE =
  "No tienes permiso para programar pedidos. Esta acción es exclusiva de Mesa de Control.";

/** ¿El error es el 400 de permiso de mesa de control? */
export const isMesaControlPermisoError = (error: unknown): boolean => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return false;
  const data = error.response.data;
  return typeof data === "object" && data !== null && "permiso" in data;
};

/**
 * Claves del 400 de "pedido no programable" de `GET` y `PATCH .../programar/`
 * (EC-750, `_exigir_programable`), en el orden en que las valida el backend:
 * primero CANCELADO (`estatus`) y luego sin confirmar (`fecha_confirmacion`);
 * si aplican las dos, solo llega `estatus`. Cada una trae una lista con un
 * mensaje. Solo se alcanzan desde una fila desactualizada: `canProgramarPedido`
 * ya oculta "Programar" para esos pedidos.
 */
export const PEDIDO_NO_PROGRAMABLE_KEYS = ["estatus", "fecha_confirmacion"] as const;

/**
 * Mensaje del backend si el error es el 400 de pedido no programable
 * (cancelado o sin confirmar); `undefined` en cualquier otro caso.
 */
export const extractPedidoNoProgramableMessage = (error: unknown): string | undefined => {
  if (!(error instanceof AxiosError) || error.response?.status !== 400) return undefined;
  return firstNonBlankRejectionMessage(error.response.data, PEDIDO_NO_PROGRAMABLE_KEYS);
};
