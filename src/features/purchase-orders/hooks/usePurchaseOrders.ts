import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getPurchaseOrders } from "../services/actions";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const usePurchaseOrders = () => {
  const { data, hasLoaded, isLoading, isInitialError, error, refetch, isFetching } =
    useGuardedQuery<PurchaseOrder[]>(
      {
        queryKey: ["purchase-orders"],
        queryFn: getPurchaseOrders,
      },
      { toastId: "purchase-orders-refetch-error" },
    );

  return {
    purchaseOrders: data ?? [],
    /**
     * `true` en cuanto hubo una respuesta exitosa, y se conserva durante los
     * refetch (también si uno falla): distingue "aún no cargó" de "cargó
     * vacío", que `purchaseOrders` (siempre un arreglo) no deja ver.
     */
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};
