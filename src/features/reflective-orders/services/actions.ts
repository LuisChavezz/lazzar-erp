import { v1_api } from "@/src/api/v1.api";
import type {
  CreatedReflectiveOrder,
  CreateReflectiveOrderPayload,
  ReflectiveOnboardingData,
  ReflectiveOrder,
  ReflectiveOrderDetail,
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
 * Detalle de UNA orden de reflejante (`GET /produccion/orden-reflejante/{id}/`).
 *
 * Hace falta una llamada propia —el diálogo ya NO se arma con la fila del
 * listado— porque desde que el backend separó los serializers las dos
 * respuestas dejaron de coincidir. El detalle trae, y el listado no:
 *  - por renglón, `cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente`
 *    (el contexto de parcialidad de la línea) y el `reflejante_config` crudo;
 *  - `otras_ordenes_del_pedido` y `reparto_por_talla_aproximado`.
 *
 * Al revés SÍ contiene: `OrdenReflejanteRetrieveSerializer` hereda de
 * `OrdenReflejanteListSerializer`, así que el detalle también declara los tres
 * campos de cobertura. Aun así el diálogo consulta por id en vez de leer la
 * fila: el enlace del 409 de duplicado nombra una orden que puede no estar en
 * la lista cargada.
 *
 * Fuera de alcance (otra empresa/sucursal) responde `404`, no `403`: el
 * `get_queryset()` acotado por tenant es el mismo que usa el listado, así que
 * un id ajeno no se distingue de uno inexistente.
 */
export const getReflectiveOrderDetail = async (
  id: number,
): Promise<ReflectiveOrderDetail> => {
  const response = await v1_api.get<ReflectiveOrderDetail>(
    `/produccion/orden-reflejante/${id}/`,
  );
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de reflejante
 * (`GET /produccion/orden-reflejante/onboarding/`).
 *
 * SIN parámetros: a diferencia de picking, este onboarding no tiene un segundo
 * modo con alcance al padre elegido (`?pedido=`) — una sola llamada trae YA el
 * detalle por talla de CADA pedido candidato (`pedidos[].detalles`), con lo
 * pedido, lo ya programado en otras OR y el saldo
 * (`cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente`). Este archivo
 * afirmaba lo contrario —"el service deriva los detalles solo en el POST, así
 * que no hay nada que previsualizar por pedido"—: dejó de ser cierto cuando el
 * backend unificó los tres onboardings de órdenes de trabajo en
 * `_payload_pedidos_onboarding`, el mismo constructor que ya alimentaba a
 * bordado.
 *
 * Ese saldo es dato vivo —otra OR del mismo pedido lo reduce— y además decide
 * qué pedidos aparecen (el backend excluye los que ya no tienen ninguna línea
 * pendiente), así que la respuesta NO se cachea como catálogo estable: ver
 * `useReflectiveOnboarding`.
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
 * La respuesta trae la orden ya creada — de ahí sale el `folio_reflejante` REAL
 * (el único válido para mostrarle al usuario, frente al `folio_or_sugerido`
 * aproximado del onboarding). OJO: `create` conserva el serializer BASE
 * (`OrdenReflejanteSerializer`), no el del listado, así que la respuesta del
 * POST NO trae los tres campos de cobertura; el listado invalidado los repone.
 *
 * `data.detalles_override` es opcional: presente, la orden cubre SOLO esas
 * líneas con esas cantidades (parcial); ausente, el service programa el 100% de
 * las tallas con reflejante del pedido. Ver `CreateReflectiveOrderPayload`.
 *
 * Toda ruta de rechazo ocurre ANTES de `generate_or_folio` y el service es
 * `@transaction.atomic`: un error no consume folio ni deja renglones sueltos.
 */
export const createReflectiveOrder = async (
  data: CreateReflectiveOrderPayload,
): Promise<CreatedReflectiveOrder> => {
  const response = await v1_api.post<CreatedReflectiveOrder>(
    "/produccion/orden-reflejante/onboarding/",
    data,
  );
  return response.data;
};
