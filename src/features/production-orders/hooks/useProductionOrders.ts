import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getProductionOrders } from "@/src/features/production-orders/services/actions";
import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";

export const useProductionOrders = () => {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useQuery<ProductionOrderListItem[]>({
      queryKey: ["production-orders"],
      queryFn: getProductionOrders,
    });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "production-orders-refetch-error",
  });

  return { data, hasLoaded, isLoading, isError, error, refetch, isRefetching };
};
