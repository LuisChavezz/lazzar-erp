import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  CreatePickingPayload,
  Picking,
  PickingListItem,
  PickingsFiltros,
  PickingsResumen,
  TransferPickingPayload,
} from "../interfaces/picking.interface";
import { pickingsApiParams } from "../utils/pickingsApiParams";
import type { PickingOnboardingData } from "../interfaces/picking-onboarding.interface";

/**
 * Página de la lista ligera de surtidos (`GET /wms/pickings/?vista=lista`,
 * `?limit=&offset=`). Los filtros llegan validados desde `useServerTable`;
 * `periodo`/`entrega` se traducen a rangos de fecha (`pickingsApiParams`).
 */
export const getPickingsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<PickingListItem>> => {
  const { data } = await v1_api.get<PaginatedListResponse<PickingListItem>>("/wms/pickings/", {
    params: { ...pickingsApiParams(params), vista: "lista" },
  });
  return data;
};

/** KPIs del conjunto filtrado (`GET /wms/pickings/resumen/`), con los mismos criterios que la lista. */
export const getPickingsResumen = async (
  params: Record<string, string | number>,
): Promise<PickingsResumen> => {
  const criterios = { ...params };
  delete criterios.ordering;
  const { data } = await v1_api.get<PickingsResumen>("/wms/pickings/resumen/", {
    params: pickingsApiParams(criterios),
  });
  return data;
};

/** Clientes y operadores con surtidos, para los filtros de encabezado. */
export const getPickingsFiltros = async (): Promise<PickingsFiltros> => {
  const { data } = await v1_api.get<PickingsFiltros>("/wms/pickings/filtros/");
  return data;
};

/**
 * Detalle de UN picking (`GET /wms/pickings/{id}/`).
 *
 * `retrieve` devuelve el MISMO `PickingSerializer` que el listado (verificado en
 * `wms/api/views.py`: `PickingViewSet` usa un `serializer_class` único, sin
 * `get_serializer_class`), así que el retorno es `Picking` crudo — la bandera
 * derivada `esta_vencida` (que define `PickingRow`) NO viene del backend y se
 * calcula en cliente con `mapPickingToRow`.
 *
 * La vista de listado NO usa este action: arma el diálogo con la fila ya
 * enriquecida en caché. Existe para consumidores que solo tienen el id —p. ej.
 * la hoja "Documentos" del detalle de pedido, vía
 * `usePickingDetail`. Fuera de alcance (otro almacén/tenant) responde `404`.
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
