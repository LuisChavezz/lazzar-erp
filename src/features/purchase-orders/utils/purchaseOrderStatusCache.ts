import type { QueryClient } from "@tanstack/react-query";
import {
  mergeCachedRecord,
  patchCachedRowById,
  pickPresentFields,
  resultRecordId,
} from "@/src/utils/cachedRows";
import { serverTableListPrefix } from "@/src/utils/serverTableParams";
import { purchaseOrderStatusEntry } from "../constants/purchaseOrderStatus";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

/** Prefijo de la caché de órdenes (`["purchase-orders"]`, ver `usePurchaseOrdersTable`). */
const PURCHASE_ORDERS_KEY = ["purchase-orders"] as const;

/**
 * Escribe el resultado de una acción de estatus de una OC (confirmar,
 * cancelar) en las páginas del listado en caché y en su detalle
 * (`["purchase-orders", id]`), ANTES de invalidar (EC-927).
 *
 * Solo los `fields` que la respuesta trae, NUNCA importes: la de `aceptar/` no
 * los filtra por rol y las dos traen el progreso en `null`. Sin `estatus_label`
 * en la respuesta, se deriva de la tabla local de estatus (la misma del badge).
 * Best-effort: una respuesta sin id o sin esos campos no escribe nada y no
 * lanza (`cachedRows`).
 */
export const writePurchaseOrderStatus = async (
  queryClient: QueryClient,
  record: unknown,
  fields: readonly (keyof PurchaseOrder & string)[],
) => {
  const id = resultRecordId(record);
  const values = pickPresentFields<PurchaseOrder>(record, fields);
  if (id === null || typeof values.estatus !== "number") return;
  if (values.estatus_label === undefined) {
    values.estatus_label = purchaseOrderStatusEntry(values.estatus).label;
  }
  await patchCachedRowById<PurchaseOrder>(
    queryClient,
    serverTableListPrefix(PURCHASE_ORDERS_KEY),
    id,
    (row) => ({ ...row, ...values }),
  );
  await mergeCachedRecord(queryClient, [...PURCHASE_ORDERS_KEY, id], id, values);
};
