import { v1_api } from "@/src/api/v1.api";
import type {
  CriticalPathUpdateBody,
  ProductionOrderCriticalPath,
} from "../interfaces/production-order-critical-path.interface";

const criticalPathUrl = (opId: number) => `/produccion/orden-produccion/${opId}/ruta-critica/`;

/**
 * OJO: CREA el registro vacío si la OP aún no tiene (`get_or_create`). Solo se
 * llama al abrir el diálogo. Una OP de otra empresa responde 404.
 */
export const getProductionOrderCriticalPath = async (
  opId: number
): Promise<ProductionOrderCriticalPath> => {
  const { data } = await v1_api.get<ProductionOrderCriticalPath>(criticalPathUrl(opId));
  return data;
};

/**
 * PATCH parcial. Responde con el registro completo (misma forma que el GET).
 * El permiso lo resuelve el servidor y lo niega con 400 `{ permiso: "..." }`.
 */
export const updateProductionOrderCriticalPath = async (
  opId: number,
  body: CriticalPathUpdateBody
): Promise<ProductionOrderCriticalPath> => {
  const { data } = await v1_api.patch<ProductionOrderCriticalPath>(criticalPathUrl(opId), body);
  return data;
};
