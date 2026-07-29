import { v1_api } from "@/src/api/v1.api";
import type { CreatePickingPayload, Picking } from "../interfaces/picking.interface";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";

/**
 * Lista los pickings (`GET /wms/pickings/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve pickings de los
 * almacenes a los que tiene acceso (mismo comportamiento que traspasos).
 *
 * Sin parámetros: el endpoint NO acepta ningún query param (no declara
 * ninguno y el backend no monta filter backend alguno), así que devuelve
 * siempre la lista completa sin paginar. Por eso el filtrado del listado vive
 * en cliente (ver `PickingView`) — mandar `?estado=`/`?prioridad=` aquí no
 * filtraría nada, solo aparentaría hacerlo.
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
 *
 * `almacenOrigenId` acota contra QUÉ almacén calcula el backend las
 * existencias por talla (`existencia_*`/`maximo_picking_permitido`). Es
 * opcional en el contrato, pero omitirlo NO significa "sin existencias": el
 * backend elige entonces un almacén candidato por su cuenta (el de menor pk de
 * la sucursal del pedido, excluyendo APARTADOS) y devuelve existencias de ESE.
 * Como el `POST` valida siempre contra el `almacen` del payload, hay que
 * mandar aquí ese mismo id para que el techo anunciado y el validado coincidan.
 */
export const getPickingOnboarding = async (
  pedidoId?: number | null,
  almacenOrigenId?: number | null,
): Promise<PickingOnboardingData> => {
  const params: Record<string, number> = {};
  if (pedidoId) params.pedido = pedidoId;
  if (almacenOrigenId) params.almacen_origen = almacenOrigenId;

  const response = await v1_api.get<PickingOnboardingData>(
    "/wms/pickings/onboarding/",
    Object.keys(params).length > 0 ? { params } : undefined,
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
