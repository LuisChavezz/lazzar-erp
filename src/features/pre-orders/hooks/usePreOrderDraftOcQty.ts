"use client";

import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPurchaseOrder } from "@/src/features/purchase-orders/services/actions";
import type { PreOrderPurchaseOrderRef } from "../interfaces/pre-order.interface";

/** Estatus 1 = Borrador: la OC existe pero aún no se autoriza ni se envía. */
export const isDraftOc = (oc: PreOrderPurchaseOrderRef) => Number(oc.estatus) === 1;

/**
 * Cantidad por material que ya está capturada en OC en BORRADOR de la
 * pre-orden. El backend solo cuenta como "en camino" (`en_transito`) lo de OC
 * autorizadas, así que sin esto un material ya pedido en borrador se vería
 * como "falta pedir". Lee el detalle de cada OC borrador (suelen ser 1–2).
 */
export const usePreOrderDraftOcQty = (ordenes: PreOrderPurchaseOrderRef[]) => {
  const ids = ordenes.filter(isDraftOc).map((oc) => oc.id).sort((a, b) => a - b);
  const { data } = useGuardedQuery(
    {
      queryKey: ["purchase-orders", "pre-orden-borradores", ids],
      queryFn: async () => {
        const ocs = await Promise.all(ids.map((id) => getPurchaseOrder(id)));
        const porMaterial: Record<number, { cantidad: number; ocs: number[] }> = {};
        for (const oc of ocs) {
          for (const d of oc.detalles ?? []) {
            const pid = (d as { producto_id?: number | null }).producto_id;
            if (!pid) continue;
            const entry = (porMaterial[pid] ??= { cantidad: 0, ocs: [] });
            entry.cantidad += Number((d as { cantidad?: number | string }).cantidad ?? 0);
            if (!entry.ocs.includes(oc.id)) entry.ocs.push(oc.id);
          }
        }
        return porMaterial;
      },
      enabled: ids.length > 0,
    },
    { toastId: "pre-orden-oc-borrador-refetch-error" },
  );
  return data ?? {};
};
