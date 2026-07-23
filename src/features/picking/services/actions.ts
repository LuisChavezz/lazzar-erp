import { v1_api } from "@/src/api/v1.api";
import type { CreatePickingPayload, Picking } from "../interfaces/picking.interface";

/**
 * Lista los pickings (`GET /wms/pickings/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve pickings de los
 * almacenes a los que tiene acceso (mismo comportamiento que traspasos).
 */
export const getPickings = async (): Promise<Picking[]> => {
  const response = await v1_api.get<Picking[]>("/wms/pickings/");
  return response.data;
};

/**
 * Crea un picking (`POST /wms/pickings/`). El backend deriva
 * `picking_detalle` de las líneas del `pedido` — el payload no envía líneas.
 */
export const createPicking = async (data: CreatePickingPayload): Promise<Picking> => {
  const response = await v1_api.post<Picking>("/wms/pickings/", data);
  return response.data;
};
