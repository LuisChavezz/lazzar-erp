import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  CreatePickingPayload,
  Picking,
  PickingKpis,
  PickingListItem,
  TransferPickingPayload,
} from "../interfaces/picking.interface";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";

/**
 * Una PÁGINA del listado de pickings (`GET /wms/pickings/?resumen=1&limit=&offset=`
 * → `{count, next, previous, results}`), con los filtros (`estado`,
 * `prioridad`), la búsqueda (`search`) y el orden (`ordering`) de la tabla en
 * modo servidor (`usePickingsTable`).
 *
 * `resumen=1` va FIJO aquí y no en la URL: las filas llegan sin
 * `picking_detalle` ni `ordenes_trabajo` (nucleo-erp #1228); el detalle los
 * pide por id al abrirse. Alcance por empresa/sucursal del backend.
 */
export const getPickingsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<PickingListItem>> => {
  const { data } = await v1_api.get<PaginatedListResponse<PickingListItem>>("/wms/pickings/", {
    params: { ...params, resumen: 1 },
  });
  return data;
};

/**
 * Indicadores del listado (`GET /wms/pickings/kpis/`, EC-921) con los MISMOS
 * filtros y búsqueda que la tabla (`criteria` de `useServerTable`). El backend
 * ignora `limit`/`offset`/`ordering`.
 */
export const getPickingKpis = async (
  params: Readonly<Record<string, string>>,
): Promise<PickingKpis> => {
  const { data } = await v1_api.get<PickingKpis>("/wms/pickings/kpis/", { params });
  return data;
};

/**
 * Detalle de UN picking (`GET /wms/pickings/{id}/`), con sus renglones
 * (`picking_detalle`). La bandera derivada `esta_vencida` (que define
 * `PickingRow`) NO viene del backend y se calcula en cliente con
 * `mapPickingToRow`.
 *
 * Lo usan todos los detalles de picking (`PickingDetailByIdDialog`, vía
 * `usePickingDetail`): el listado, el detalle de pedido y la auditoría
 * documental. Fuera de alcance (otro almacén/tenant) responde `404`.
 */
export const getPickingDetail = async (id: number): Promise<Picking> => {
  const response = await v1_api.get<Picking>(`/wms/pickings/${id}/`);
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

/**
 * Traslada un picking a otro almacén (`POST /wms/pickings/{id}/trasladar/`).
 *
 * Devuelve el `PickingSerializer` completo —la misma forma que el detalle—,
 * con el `almacen` nuevo, `almacen_destino` en `null` si el nuevo almacén era
 * el destino, la nota del traslado añadida a `observaciones` y en `null` las
 * ubicaciones de línea que eran de otro almacén. El `estado` no cambia.
 */
export const transferPicking = async (
  id: number,
  data: TransferPickingPayload,
): Promise<Picking> => {
  const response = await v1_api.post<Picking>(`/wms/pickings/${id}/trasladar/`, data);
  return response.data;
};
