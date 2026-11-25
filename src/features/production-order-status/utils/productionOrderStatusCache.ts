import type { QueryClient } from "@tanstack/react-query";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import type { ChangeProductionOrderStatusResponse } from "../interfaces/production-order-status.interface";

/**
 * Escritura en caché del resultado del POST `estatus/` (EC-927, EC-948): el
 * estatus nuevo y, al cancelar, quién, cuándo y por qué. La OP se identifica
 * por `op_id` (su llave primaria; no hay `id`), así que no sirven los helpers
 * de `cachedRows`, que buscan `id`. Mismas reglas: best-effort, nunca lanza, y
 * una respuesta de otra OP o sin estatus no escribe nada.
 */

/** Los campos de la respuesta que se escriben en la OP. */
const STATUS_FIELDS = [
  "estatus_op",
  "estatus_op_display",
  "fecha_fin",
  "motivo_cancelacion",
  "fecha_cancelacion",
  "cancelado_por",
  "cancelado_por_nombre",
] as const satisfies readonly (keyof ChangeProductionOrderStatusResponse)[];

const asObject = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Lo que la respuesta trae para la OP `opId`; `{}` si es de otra OP o no trae el estatus. */
export const productionOrderStatusValues = (opId: number, response: unknown): Record<string, unknown> => {
  const record = asObject(response);
  if (record?.op_id !== opId || typeof record.estatus_op !== "number") return {};
  const values: Record<string, unknown> = {};
  for (const field of STATUS_FIELDS) {
    if (record[field] !== undefined) values[field] = record[field];
  }
  return values;
};

/**
 * Aplica `values` a la OP `opId` en lo que haya en caché con su forma: un
 * arreglo de filas (el listado) o el registro mismo (el detalle). Devuelve la
 * MISMA referencia si no hay nada de esa OP, para no marcar fresca una
 * consulta que no cambió.
 */
export const patchProductionOrderData = (data: unknown, opId: number, values: Record<string, unknown>): unknown => {
  if (Array.isArray(data)) {
    if (!data.some((row) => asObject(row)?.op_id === opId)) return data;
    return data.map((row) => (asObject(row)?.op_id === opId ? { ...row, ...values } : row));
  }
  const record = asObject(data);
  return record?.op_id === opId ? { ...record, ...values } : data;
};

/**
 * Escribe el resultado en el listado y el retrieve de OPs (`["production-orders", …]`)
 * y en su detalle (`["production-order-onboarding", opId]`), ANTES de que el
 * hook invalide como siempre.
 */
export const writeProductionOrderStatus = async (
  queryClient: QueryClient,
  opId: number,
  response: unknown,
) => {
  const values = productionOrderStatusValues(opId, response);
  if (Object.keys(values).length === 0) return;
  try {
    for (const queryKey of [["production-orders"], productionOrderOnboardingKey(opId)]) {
      await queryClient.cancelQueries({ queryKey });
      for (const [key, data] of queryClient.getQueriesData({ queryKey })) {
        const next = patchProductionOrderData(data, opId, values);
        if (next !== data) queryClient.setQueryData(key, next);
      }
    }
  } catch (error) {
    console.error("No se pudo escribir el estatus de la OP en la caché", error);
  }
};
