import { v1_api } from "@/src/api/v1.api";
import type {
  RecalculateConsumptionBody,
  RecalculateConsumptionResponse,
} from "../interfaces/production-order-consumption.interface";

/**
 * Recalcula los consumos de los productos indicados y mueve inventario por la
 * diferencia. No es idempotente en efectos (cada llamada con cambios agrega un
 * registro de consumo y un movimiento), así que nunca se reintenta solo.
 */
export const recalculateProductionOrderConsumption = async (
  opId: number,
  body: RecalculateConsumptionBody,
): Promise<RecalculateConsumptionResponse> => {
  const { data } = await v1_api.post<RecalculateConsumptionResponse>(
    `/produccion/orden-produccion/${opId}/recalcular-consumos/`,
    body,
  );
  return data;
};
