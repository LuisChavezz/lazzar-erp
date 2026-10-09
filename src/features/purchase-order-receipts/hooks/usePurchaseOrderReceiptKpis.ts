import { useQuery } from "@tanstack/react-query";
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
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de OCs, recepciones, inspecciones y facturas de proveedor que cambian en
 * otras pantallas; con el `staleTime` global de 15 min, volver a la lista
 * mostraría cifras viejas. Mismo criterio que `usePurchaseOrderKpis`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const usePurchaseOrderReceiptKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<PurchaseOrderReceiptKpis>({
    queryKey: purchaseOrderReceiptKpisQueryKey,
    queryFn: () => getPurchaseOrderReceiptKpis(),
    refetchOnMount: "always",
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
