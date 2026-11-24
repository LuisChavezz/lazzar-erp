import type { ShipmentEstado } from "../interfaces/shipping.interface";

/** Parámetro de la URL del listado de Envíos con el filtro de estado (EC-945). */
export const SHIPMENT_ESTADO_PARAM = "estado";

const ESTADOS: readonly ShipmentEstado[] = ["ACTIVO", "CANCELADO"];

/**
 * Estado del filtro leído de la URL: `ACTIVO`, `CANCELADO` o `null` (todos).
 * Un valor desconocido se trata como ausente: nunca se manda al backend.
 */
export const parseShipmentEstadoParam = (value: string | null): ShipmentEstado | null => {
  const upper = value?.trim().toUpperCase();
  return ESTADOS.find((estado) => estado === upper) ?? null;
};

/**
 * Query string con el filtro aplicado, conservando los demás parámetros.
 * "Todos" (`null`) quita el parámetro: el valor por defecto no se escribe.
 */
export const withShipmentEstadoParam = (current: string, estado: ShipmentEstado | null): string => {
  const params = new URLSearchParams(current);
  if (estado) params.set(SHIPMENT_ESTADO_PARAM, estado);
  else params.delete(SHIPMENT_ESTADO_PARAM);
  return params.toString();
};
