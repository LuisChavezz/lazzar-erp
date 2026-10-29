import { AxiosError } from "axios";

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
