import type { QueryClient } from "@tanstack/react-query";
import { productionOrderOnboardingKey } from "@/src/features/production-orders/hooks/useProductionOrderOnboarding";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import type { ChangeProductionOrderStatusResponse } from "../interfaces/production-order-status.interface";

/**
 * Escritura en caché del resultado del POST `estatus/` (EC-927, EC-948): el
 * estatus nuevo y, al cancelar, quién, cuándo y por qué. Con los helpers de
 * `cachedRows` por `op_id` (la llave primaria de la OP; no trae `id`): mismas
 * reglas, best-effort, nunca lanza, y una respuesta de otra OP o sin estatus no
 * escribe nada.
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

const BY_OP_ID = { idField: "op_id" } as const;

/** Lo que la respuesta trae para la OP `opId`; `{}` si es de otra OP o no trae el estatus. */
export const productionOrderStatusValues = (opId: number, response: unknown): Record<string, unknown> => {
  const record = response as Partial<ChangeProductionOrderStatusResponse> | null | undefined;
  if (record?.op_id !== opId || typeof record.estatus_op !== "number") return {};
  return pickPresentFields<ChangeProductionOrderStatusResponse>(record, STATUS_FIELDS);
};

/**
 * Escribe el resultado en las filas del listado de OPs (`["production-orders"]`),
 * en su retrieve (`["production-orders", "retrieve", opId]`) y en su detalle
 * (`["production-order-onboarding", opId]`), ANTES de que el hook invalide como
 * siempre.
 */
export const writeProductionOrderStatus = async (
  queryClient: QueryClient,
  opId: number,
  response: unknown,
) => {
  const values = productionOrderStatusValues(opId, response);
  if (Object.keys(values).length === 0) return;
  await patchCachedRowById<Record<string, unknown>>(
    queryClient,
    ["production-orders"],
    opId,
    (row) => ({ ...row, ...values }),
    BY_OP_ID,
  );
  await mergeCachedRecord(queryClient, ["production-orders", "retrieve", opId], opId, values, BY_OP_ID);
  await mergeCachedRecord(queryClient, productionOrderOnboardingKey(opId), opId, values, BY_OP_ID);
};
