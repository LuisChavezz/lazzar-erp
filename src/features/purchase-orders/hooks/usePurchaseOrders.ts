import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrders } from "../services/actions";
import { PurchaseOrder } from "../interfaces/purchase-order.interface";

export const usePurchaseOrders = () => {
  const {
    data: purchaseOrders = [],
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
    purchaseOrders,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
