import type { ShipmentEstado } from "../interfaces/shipping.interface";

/**
 * ¿El despacho ya se entregó? (nucleo-erp #1361). Entregar no cambia `estado`
 * (sigue `ACTIVO`): lo único que lo dice es `fecha_entrega` no nula. Sirve igual
 * para la fila del listado de envíos que para la de `documentos/` del pedido
 * (#1432); un backend anterior que no manda el campo cuenta como no entregado.
 */
export const isShipmentDelivered = (shipment: { fecha_entrega?: string | null }): boolean =>
  typeof shipment.fecha_entrega === "string" && shipment.fecha_entrega.length > 0;

/**
 * Estado que se MUESTRA de un envío: el `estado` del backend, salvo que uno
 * activo ya se entregó, que se muestra "Entregado". No es un valor del API ni
 * del filtro Todos / Activos / Cancelados: un entregado sigue bajo Activos.
 */
export type ShipmentDisplayStatus = ShipmentEstado | "ENTREGADO";

export const shipmentDisplayStatus = (shipment: {
  estado: ShipmentEstado;
  fecha_entrega?: string | null;
}): ShipmentDisplayStatus =>
  shipment.estado === "ACTIVO" && isShipmentDelivered(shipment) ? "ENTREGADO" : shipment.estado;

/**
 * ¿El despacho admite "Entregar"? Activo y sin entrega registrada: el backend
 * rechaza un cancelado o uno ya entregado (`400 {"despacho"}`). El permiso
 * (`C-WMS-ENVIO`) lo decide quien monta la acción.
 */
export const canDeliverShipment = (shipment: { estado: ShipmentEstado; fecha_entrega?: string | null }): boolean =>
  shipment.estado === "ACTIVO" && !isShipmentDelivered(shipment);
