import { v1_api } from "@/src/api/v1.api";
import type {
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
