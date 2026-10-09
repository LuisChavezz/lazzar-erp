import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrders } from "../services/actions";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";

export const usePurchaseOrders = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["purchase-orders"],
    queryFn: getPurchaseOrders,
  });

  return {
    purchaseOrders: data ?? [],
    /**
     * `true` en cuanto hubo una respuesta exitosa, y se conserva durante los
     * refetch (también si uno falla): distingue "aún no cargó" de "cargó
     * vacío", que `purchaseOrders` (siempre un arreglo) no deja ver.
     */
    hasLoaded: data !== undefined,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
