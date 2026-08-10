import { v1_api } from "@/src/api/v1.api";
import type {
  CreateEmbroideryOrderPayload,
  EmbroideryOnboardingData,
  EmbroideryOrder,
  EmbroideryOrderDetail,
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
 * Detalle de UNA orden de bordado (`GET /produccion/orden-bordado/{id}/`).
 *
 * Hace falta una llamada propia —el diálogo ya NO se arma con la fila del
 * listado— porque desde que el backend separó los serializers las dos
 * respuestas dejaron de coincidir. El detalle trae, y el listado no:
 *  - por renglón, `cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente`
 *    (el contexto de parcialidad de la línea) y `ubicaciones`;
 *  - `otras_ordenes_del_pedido` y `reparto_por_talla_aproximado`.
 *
 * Y al revés: el detalle NO trae los tres campos de cobertura del listado.
 * Ninguna respuesta contiene a la otra.
 *
 * Fuera de alcance (otra empresa/sucursal) responde `404`, no `403`: el
 * `get_queryset()` acotado por tenant es el mismo que usa el listado, así que
 * un id ajeno no se distingue de uno inexistente.
 */
export const getEmbroideryOrderDetail = async (
  id: number,
): Promise<EmbroideryOrderDetail> => {
  const response = await v1_api.get<EmbroideryOrderDetail>(
    `/produccion/orden-bordado/${id}/`,
  );
  return response.data;
};

/**
 * Catálogos para dar de alta una orden de bordado
 * (`GET /produccion/orden-bordado/onboarding/`).
 *
 * SIN parámetros: a diferencia de picking, este onboarding no tiene un segundo
 * modo con alcance al padre elegido (`?pedido=`) — una sola llamada trae YA el
 * detalle por talla de CADA pedido candidato (`pedidos[].detalles`), con lo
 * pedido, lo ya programado en otras OB y el saldo
 * (`cantidad_pedido`/`cantidad_asignada`/`cantidad_pendiente`).
 *
 * Ese saldo es dato vivo —otra OB del mismo pedido lo reduce— y además decide
 * qué pedidos aparecen (el backend excluye los que ya no tienen ninguna línea
 * pendiente), así que la respuesta NO se cachea como catálogo estable: ver
 * `useEmbroideryOnboarding`.
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
 * `data.detalles_override` es opcional: presente, la orden cubre SOLO esas
 * líneas con esas cantidades (parcial); ausente, el service programa el 100%
 * de las tallas con bordado del pedido, que es lo que hace el alta de un solo
 * paso actual. Ver `CreateEmbroideryOrderPayload`.
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
