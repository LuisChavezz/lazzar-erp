import { v1_api } from "@/src/api/v1.api";
import type {
  ChangeProductionOrderStatusBody,
  ChangeProductionOrderStatusResponse,
  ProductionOrderStatusInfo,
} from "../interfaces/production-order-status.interface";

const statusUrl = (opId: number) => `/produccion/orden-produccion/${opId}/estatus/`;

/**
 * Estatus actual y destinos posibles. Solo lectura. 404 `{ msg }` si la OP no
 * es visible para el usuario (el backend acota este endpoint por sucursal,
 * a diferencia del detalle).
 */
export const getProductionOrderStatus = async (
  opId: number,
): Promise<ProductionOrderStatusInfo> => {
  const { data } = await v1_api.get<ProductionOrderStatusInfo>(statusUrl(opId));
  return data;
};

/**
 * Cambia el estatus. Es la ÚNICA vía: `estatus_op` en el PATCH/PUT genérico de
 * la OP se ignora en silencio. El permiso lo resuelve el servidor y lo niega
 * con 400 `{ permiso }`; los requisitos de la ruta crítica, con 409
 * `{ msg, bloqueos, se_puede_forzar }`.
 */
export const changeProductionOrderStatus = async (
  opId: number,
  body: ChangeProductionOrderStatusBody,
): Promise<ChangeProductionOrderStatusResponse> => {
  const { data } = await v1_api.post<ChangeProductionOrderStatusResponse>(statusUrl(opId), body);
  return data;
};
