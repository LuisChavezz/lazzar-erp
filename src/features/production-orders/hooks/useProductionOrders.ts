import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getProductionOrders } from "@/src/features/production-orders/services/actions";
import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";

/**
 * `enabled: false` no pide el listado: para pantallas de otro módulo que lo usan
 * como catálogo y cuyo usuario puede no tener `R-PRODUCCION-OP` (EC-895).
 */
export const useProductionOrders = ({ enabled = true }: { enabled?: boolean } = {}) => {
  const { data, isLoading, isError, errorUpdatedAt, error, refetch, isRefetching } =
    useQuery<ProductionOrderListItem[]>({
      queryKey: ["production-orders"],
      queryFn: getProductionOrders,
      enabled,
    });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "production-orders-refetch-error",
  });

  return { data, hasLoaded, isLoading, isError, error, refetch, isRefetching };
};
