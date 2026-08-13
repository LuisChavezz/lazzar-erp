import { v1_api } from "@/src/api/v1.api";
import type { CreatePackingPayload, Packing } from "../interfaces/packing.interface";
import type { PackingOnboardingData } from "../interfaces/packing-onboarding.interface";

/**
 * Lista los packings (`GET /wms/packings/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve packings de los
 * almacenes a los que tiene acceso (mismo comportamiento que picking y
 * traspasos). Sin parámetros de filtro/paginación: el backend devuelve el
 * arreglo completo, ordenado `-created_at, -id`.
 */
export const getPackings = async (): Promise<Packing[]> => {
  const response = await v1_api.get<Packing[]>("/wms/packings/");
  return response.data;
};

/**
 * Detalle de UN packing (`GET /wms/packings/{id}/`).
 *
 * `retrieve` devuelve el MISMO `PackingSerializer` que el listado (verificado en
 * `wms/api/views.py`: `PackingViewSet` usa un `serializer_class` único, sin
 * `get_serializer_class`), así que el retorno es `Packing` — sin campos
 * derivados en cliente, a diferencia de picking (`esta_vencida`).
 *
 * La vista de listado NO usa este action: arma el diálogo con la fila en caché.
 * Existe para consumidores que solo tienen el id —p. ej. la sección "Documentos
 * relacionados" del detalle de pedido, vía `usePackingDetail`. Fuera de alcance
 * (otro almacén/tenant) responde `404`.
 */
export const getPackingDetail = async (id: number): Promise<Packing> => {
  const response = await v1_api.get<Packing>(`/wms/packings/${id}/`);
  return response.data;
};

/**
 * Datos de onboarding para armar un packing (`GET /wms/packings/onboarding/`).
 *
 * Sin `pickingId` devuelve solo el catálogo de pickings candidatos. Con
 * `pickingId` añade el picking elegido y `packing_detalle`: el pendiente real
 * por empacar por línea. Ese pendiente cambia con el tiempo, así que el hook
 * que consume esta acción no lo cachea por mucho (ver `usePackingOnboarding`).
 */
export const getPackingOnboarding = async (
  pickingId?: number | null,
): Promise<PackingOnboardingData> => {
  const response = await v1_api.get<PackingOnboardingData>(
    "/wms/packings/onboarding/",
    pickingId ? { params: { picking: pickingId } } : undefined,
  );
  return response.data;
};

/**
 * Crea un packing (`POST /wms/packings/`, idéntico a
 * `POST .../onboarding/`). El payload lleva `picking_detalle`: la cantidad a
 * empacar por línea de picking.
 */
export const createPacking = async (data: CreatePackingPayload): Promise<Packing> => {
  const response = await v1_api.post<Packing>("/wms/packings/", data);
  return response.data;
};
