import { useQuery } from "@tanstack/react-query";
import { PROCUREMENT_KPI_STALE_TIME } from "@/src/constants/queryCache";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPurchaseOrderKpis } from "../services/actions";
import type { PurchaseOrderKpis } from "../interfaces/purchase-order-kpis.interface";
import { purchaseOrderKpisQueryKey } from "../constants/purchaseOrderKpis";

/**
 * Indicadores de órdenes de compra (`GET /compras/ordenes/kpis/`).
 *
 * `staleTime` de 30 s (`PROCUREMENT_KPI_STALE_TIME`): el backend los CALCULA
 * en cada lectura a partir de OCs y recepciones, y otro usuario puede
 * cambiarlas en otra sesión; volver a la lista pasados 30 s los relee, y
 * volver antes (p. ej. al ir y venir entre pestañas de Compras) usa la caché.
 * Las mutaciones de esta sesión los refrescan al momento invalidando el prefijo
 * `["purchase-orders"]`, y "Actualizar datos" de la tabla también los relee
 * (`extraRefetchQueryKeys` de `PurchaseOrderView`). Mismo criterio que
 * `usePurchaseOrderReceiptKpis`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const usePurchaseOrderKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<PurchaseOrderKpis>({
    queryKey: purchaseOrderKpisQueryKey,
    queryFn: () => getPurchaseOrderKpis(),
    staleTime: PROCUREMENT_KPI_STALE_TIME,
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "purchase-order-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
