import { v1_api } from "@/src/api/v1.api";
import type {
  NextCatalogProductCode,
  SampleProductionVariant,
  SampleSkuOnboardingPayload,
  SpecialOrderDetail,
  SpecialOrderListItem,
} from "../interfaces/special-order.interface";

/**
 * Lista los pedidos especiales (`GET /produccion/pedidos-especiales/`).
 *
 * Solo lectura, sin parámetros ni paginación: el backend devuelve el arreglo
 * completo, acotado por la empresa del usuario (sin filtro por sucursal ni
 * restricción de rol), ya ordenado por `-fecha_confirmacion, -id`.
 */
export const getSpecialOrders = async (): Promise<SpecialOrderListItem[]> => {
  const response = await v1_api.get<SpecialOrderListItem[]>(
    "/produccion/pedidos-especiales/",
  );
  return response.data;
};

/**
 * Detalle de UN pedido especial (`GET /produccion/pedidos-especiales/{id}/`),
 * con sus líneas de muestra. Un id de otra empresa o inexistente responde
 * `404`.
 */
export const getSpecialOrderDetail = async (
  id: number,
): Promise<SpecialOrderDetail> => {
  const response = await v1_api.get<SpecialOrderDetail>(
    `/produccion/pedidos-especiales/${id}/`,
  );
  return response.data;
};

/**
 * Alta de SKU de producción + lista de materiales de UNA línea de muestra
 * (`POST /produccion/pedidos-especiales/{id}/variante-onboarding/`). Crea una
 * variante por talla con cantidad y responde `201` con el arreglo de variantes.
 */
export const createSampleSkuOnboarding = async (
  pedidoId: number,
  payload: SampleSkuOnboardingPayload,
): Promise<SampleProductionVariant[]> => {
  const response = await v1_api.post<SampleProductionVariant[]>(
    `/produccion/pedidos-especiales/${pedidoId}/variante-onboarding/`,
    payload,
  );
  return response.data;
};

/**
 * Código que tendría el producto de catálogo creado con `alta_catalogo`
 * (`GET /catalogo/producto/siguiente-codigo/?categoria_producto=`). Es una
 * vista previa: el backend NO lo reserva y recalcula el real al crear, así que
 * puede cambiar si otra alta en la misma categoría llega antes. Una categoría
 * de otra empresa o inexistente responde `400` en `categoria_producto`.
 */
export const getNextCatalogProductCode = async (
  categoriaProductoId: number,
): Promise<NextCatalogProductCode> => {
  const response = await v1_api.get<NextCatalogProductCode>(
    "/catalogo/producto/siguiente-codigo/",
    { params: { categoria_producto: categoriaProductoId } },
  );
  return response.data;
};
