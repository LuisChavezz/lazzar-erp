import { v1_api } from "@/src/api/v1.api";
import type {
  CreateEmbroideryOrderPayload,
  EmbroideryOnboardingData,
  EmbroideryOrder,
} from "../interfaces/embroidery.interface";

/**
 * Lista las órdenes de bordado (`GET /produccion/orden-bordado/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve las órdenes de las
 * sucursales a las que tiene acceso (mismo criterio que picking/packing/
 * despacho; fuera de alcance devuelve `200 []`). Sin parámetros de filtro ni
 * paginación: el backend devuelve el arreglo COMPLETO.
 *
 * El `queryset` ordena por `-fecha_inicio, -id`, así que el arreglo llega ya en
 * el orden de presentación (más reciente primero) y el frontend no reordena
 * nada (ver `useEmbroideryOrders`).
 */
export const getEmbroideryOrders = async (): Promise<EmbroideryOrder[]> => {
  const response = await v1_api.get<EmbroideryOrder[]>("/produccion/orden-bordado/");
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de bordado
 * (`GET /produccion/orden-bordado/onboarding/`).
 *
 * SIN parámetros: a diferencia de picking/packing/despacho, este onboarding no
 * tiene un segundo modo con alcance al padre elegido (`?pedido=`) — el service
 * deriva los detalles solo en el POST, así que no hay nada que previsualizar
 * por pedido. Por eso basta una sola llamada y se cachea como catálogo normal.
 *
 * Fuera de alcance (sin empresa o sin sucursales permitidas) responde `200`
 * con los arreglos vacíos, no un error.
 */
export const getEmbroideryOnboarding = async (): Promise<EmbroideryOnboardingData> => {
  const response = await v1_api.get<EmbroideryOnboardingData>(
    "/produccion/orden-bordado/onboarding/",
  );
  return response.data;
};

/**
 * Crea una orden de bordado (`POST /produccion/orden-bordado/onboarding/`).
 *
 * Se usa la ruta `onboarding/` y NO el `POST /produccion/orden-bordado/` a
 * secas: comparten serializer y service, pero el segundo responde `200` en vez
 * del `201` que corresponde a una creación.
 *
 * La respuesta trae la orden ya creada con el mismo shape del listado — de ahí
 * sale el `folio_bordado` REAL (el único válido para mostrarle al usuario).
 *
 * Toda ruta de rechazo ocurre ANTES de `generate_ob_folio` y el service es
 * `@transaction.atomic`: un error no consume folio ni deja renglones sueltos.
 */
export const createEmbroideryOrder = async (
  data: CreateEmbroideryOrderPayload,
): Promise<EmbroideryOrder> => {
  const response = await v1_api.post<EmbroideryOrder>(
    "/produccion/orden-bordado/onboarding/",
    data,
  );
  return response.data;
};
