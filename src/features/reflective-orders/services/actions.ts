import { v1_api } from "@/src/api/v1.api";
import type {
  CreateReflectiveOrderPayload,
  ReflectiveOnboardingData,
  ReflectiveOrder,
} from "../interfaces/reflective-order.interface";

/**
 * Lista las órdenes de reflejante (`GET /produccion/orden-reflejante/`).
 *
 * Tenant-scoped por empresa/sucursal — el usuario solo ve las órdenes de las
 * sucursales a las que tiene acceso (mismo criterio que bordado/picking/
 * packing; fuera de alcance devuelve `200 []`). Sin parámetros de filtro ni
 * paginación: el proyecto no configura `DEFAULT_PAGINATION_CLASS`, así que el
 * backend devuelve el arreglo COMPLETO (el esquema OpenAPI lo confirma: la
 * respuesta del listado es un `array` de `OrdenReflejante`, sin envoltorio
 * `count`/`results`).
 *
 * Igual que bordado, el `queryset` ordena por `-fecha_inicio, -id`, así que el
 * arreglo llega ya en el orden de presentación (más reciente primero) y el
 * frontend no reordena nada (ver `useReflectiveOrders`).
 */
export const getReflectiveOrders = async (): Promise<ReflectiveOrder[]> => {
  const response = await v1_api.get<ReflectiveOrder[]>(
    "/produccion/orden-reflejante/",
  );
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de reflejante
 * (`GET /produccion/orden-reflejante/onboarding/`).
 *
 * SIN parámetros: este onboarding no tiene un segundo modo con alcance al padre
 * elegido (`?pedido=`) como picking/packing/despacho — el service deriva los
 * detalles solo en el POST, así que no hay nada que previsualizar por pedido.
 * Por eso basta una sola llamada y se cachea como catálogo normal.
 *
 * Fuera de alcance (sin empresa o sin sucursales permitidas) responde `200` con
 * los arreglos vacíos y `preview.folio_or_sugerido` en `null`, no un error.
 */
export const getReflectiveOnboarding = async (): Promise<ReflectiveOnboardingData> => {
  const response = await v1_api.get<ReflectiveOnboardingData>(
    "/produccion/orden-reflejante/onboarding/",
  );
  return response.data;
};

/**
 * Crea una orden de reflejante (`POST /produccion/orden-reflejante/onboarding/`).
 *
 * Se usa la ruta `onboarding/` y NO el `POST /produccion/orden-reflejante/` a
 * secas: comparten serializer y service, pero el segundo responde `200` en vez
 * del `201` que corresponde a una creación (verificado en
 * `OrdenReflejanteViewSet.create`, que devuelve `status.HTTP_200_OK`).
 *
 * La respuesta trae la orden ya creada con el mismo shape del listado — de ahí
 * sale el `folio_reflejante` REAL (el único válido para mostrarle al usuario,
 * frente al `folio_or_sugerido` aproximado del onboarding).
 *
 * Toda ruta de rechazo ocurre ANTES de `generate_or_folio` y el service es
 * `@transaction.atomic`: un error no consume folio ni deja renglones sueltos.
 */
export const createReflectiveOrder = async (
  data: CreateReflectiveOrderPayload,
): Promise<ReflectiveOrder> => {
  const response = await v1_api.post<ReflectiveOrder>(
    "/produccion/orden-reflejante/onboarding/",
    data,
  );
  return response.data;
};
