import { isAxiosError } from "axios";
import { isClientError } from "@/src/utils/drfWriteErrors";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";

/**
 * Claves con las que `kpis-detalle/` rechaza la consulta (400): un `factor`
 * inválido, parámetros que no soporta, o un `sucursal`/fecha mal formado.
 */
const REJECTION_KEYS = ["factor", "parametros", "sucursal", "fecha_desde", "fecha_hasta", "detail"] as const;

/**
 * Motivo de un 4xx definitivo de `kpis-detalle/` (el 404/403 se trata aparte,
 * como "no disponible"): la misma petición daría la misma respuesta, así que
 * "Reintentar" no sirve. `undefined` si el fallo es pasajero (red, 5xx, 408,
 * 429) y reintentar sí puede salir bien.
 */
export const supplierKpiDetailRejection = (error: unknown): string | undefined => {
  if (!isClientError(error)) return undefined;
  const message = isAxiosError(error) ? firstRejectionMessage(error.response?.data, REJECTION_KEYS) : undefined;
  return message ?? "El servidor rechazó la consulta del detalle.";
};
