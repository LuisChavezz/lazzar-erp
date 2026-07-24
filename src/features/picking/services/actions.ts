import { v1_api } from "@/src/api/v1.api";
import type { CreatePickingPayload, Picking } from "../interfaces/picking.interface";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";

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
 * Datos de onboarding para armar un picking (`GET /wms/pickings/onboarding/`).
 *
 * Sin `pedidoId` devuelve solo los selectores (pedidos/operadores/almacenes).
 * Con `pedidoId` añade el pedido elegido y `picking_detalle`: el pendiente real
 * por talla. Ese pendiente cambia con el tiempo, así que el hook que consume
 * esta acción no lo cachea por mucho (ver `usePickingOnboarding`).
 */
export const getPickingOnboarding = async (
  pedidoId?: number | null,
): Promise<PickingOnboardingData> => {
  const response = await v1_api.get<PickingOnboardingData>(
    "/wms/pickings/onboarding/",
    pedidoId ? { params: { pedido: pedidoId } } : undefined,
  );
  return response.data;
};

/**
 * Crea un picking parcial (`POST /wms/pickings/`, idéntico a
 * `POST .../onboarding/`). El payload lleva `picking_detalle`: la cantidad a
 * surtir por talla en esta entrega.
 */
export const createPicking = async (data: CreatePickingPayload): Promise<Picking> => {
  const response = await v1_api.post<Picking>("/wms/pickings/", data);
  return response.data;
};
