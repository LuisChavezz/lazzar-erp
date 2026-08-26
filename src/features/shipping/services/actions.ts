import { v1_api } from "@/src/api/v1.api";
import type { CreateShipmentPayload, Shipment } from "../interfaces/shipping.interface";
import type { ShipmentOnboardingData } from "../interfaces/shipping-onboarding.interface";

/**
 * Lista los despachos (`GET /wms/despachos/`).
 *
 * Sin parámetros de filtro/paginación: el backend devuelve el arreglo
 * completo, ordenado `-id` (`Despacho` no tiene timestamp propio). El
 * `prefetch_related` de este endpoint no está condicionado por acción, así
 * que el listado incluye el arreglo completo de `despacho_detalle` por cada
 * renglón, igual que el detalle — una característica del backend a tener en
 * cuenta, no algo que resolver en el frontend.
 */
export const getShipments = async (): Promise<Shipment[]> => {
  const response = await v1_api.get<Shipment[]>("/wms/despachos/");
  return response.data;
};

/**
 * Datos de onboarding para armar un despacho
 * (`GET /wms/despachos/onboarding/`).
 *
 * Sin `packingId` devuelve solo el catálogo de packings candidatos. Con
 * `packingId` añade el packing elegido y `despacho_detalle`: la elegibilidad
 * de despacho por línea, que cambia con el tiempo — por eso el hook que
 * consume esta acción casi no la cachea (ver `useShippingOnboarding`).
 *
 * El id se filtra a entero positivo ANTES de mandarlo: un `?packing` no
 * numérico revienta el endpoint con un `500` sin capturar (bug confirmado del
 * backend). Con un valor no válido se pide el catálogo a secas, que es
 * exactamente lo que la UI necesita cuando todavía no hay packing elegido.
 */
export const getShippingOnboarding = async (
  packingId?: number | null,
): Promise<ShipmentOnboardingData> => {
  const isValidId =
    typeof packingId === "number" && Number.isInteger(packingId) && packingId > 0;
  const response = await v1_api.get<ShipmentOnboardingData>(
    "/wms/despachos/onboarding/",
    isValidId ? { params: { packing: packingId } } : undefined,
  );
  return response.data;
};

/**
 * Crea un despacho (`POST /wms/despachos/`, idéntico a
 * `POST .../onboarding/`). El body lleva únicamente el `packing` y las líneas
 * marcadas; `envio` se omite a propósito (ver `CreateShipmentPayload`).
 */
export const createShipment = async (data: CreateShipmentPayload): Promise<Shipment> => {
  const response = await v1_api.post<Shipment>("/wms/despachos/", data);
  return response.data;
};
