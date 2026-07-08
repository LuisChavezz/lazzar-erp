import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPurchaseOrderReceipts } from "../services/actions";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

/**
 * Vista de Compras: recepciones filtradas server-side a `tipo_origen=OC`.
 * Reutiliza la acción compartida `getReceipts` (vía `getPurchaseOrderReceipts`)
 * pero con su propia `queryKey` (["purchase-order-receipts"]) para que el
 * caché no colisione con la vista sin filtro de WMS (["receipts"]).
 */
export const usePurchaseOrderReceipts = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    PurchaseOrderReceipt[]
  >({
    queryKey: ["purchase-order-receipts"],
    queryFn: () => getPurchaseOrderReceipts(),
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
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
