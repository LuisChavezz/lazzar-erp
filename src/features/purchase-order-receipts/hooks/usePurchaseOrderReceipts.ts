import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getPurchaseOrderReceipts } from "../services/actions";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

/**
 * Vista de Compras: recepciones filtradas server-side a `tipo_origen=OC`.
 * Reutiliza la acción compartida `getReceipts` (vía `getPurchaseOrderReceipts`)
 * pero con su propia `queryKey` (["purchase-order-receipts"]) para que el
 * caché no colisione con la vista sin filtro de WMS (["receipts"]).
 */
export const usePurchaseOrderReceipts = () => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isFetching } = useQuery<
    PurchaseOrderReceipt[]
  >({
    queryKey: ["purchase-order-receipts"],
    queryFn: () => getPurchaseOrderReceipts(),
    gcTime: LIST_QUERY_GC_TIME,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "purchase-order-receipts-refetch-error",
  });

  return {
    receipts: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
