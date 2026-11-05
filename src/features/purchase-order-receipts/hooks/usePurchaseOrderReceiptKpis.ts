import { useQuery } from "@tanstack/react-query";
import { KPI_QUERY_STALE_TIME } from "@/src/constants/queryCache";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPurchaseOrderReceiptKpis } from "../services/actions";
import type { PurchaseOrderReceiptKpis } from "../interfaces/purchase-order-receipt-kpis.interface";

/**
 * Llave DENTRO del prefijo `["purchase-order-receipts"]` (mismo criterio que
 * `["purchase-orders", "kpis"]`): el alta de recepciones y la de inspecciones
 * de calidad ya invalidan ese prefijo, así que refrescan también los
 * indicadores sin tocarlas.
 */
export const purchaseOrderReceiptKpisQueryKey = ["purchase-order-receipts", "kpis"] as const;

/**
 * Indicadores de recepciones de compra (`GET /compras/recepciones/kpis/`).
 *
 * `staleTime` de 30 s (`KPI_QUERY_STALE_TIME`), mismo criterio que
 * `usePurchaseOrderKpis`: el backend los CALCULA en cada lectura a partir de
 * OCs, recepciones, inspecciones y facturas de proveedor que otro usuario
 * puede cambiar en otra sesión; pasados 30 s se releen al volver, y antes se
 * usa la caché. Las mutaciones de esta sesión invalidan la llave (ver arriba).
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const usePurchaseOrderReceiptKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<PurchaseOrderReceiptKpis>({
    queryKey: purchaseOrderReceiptKpisQueryKey,
    queryFn: () => getPurchaseOrderReceiptKpis(),
    staleTime: KPI_QUERY_STALE_TIME,
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "purchase-order-receipt-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, isInitialError, isFetching, refetch };
};
