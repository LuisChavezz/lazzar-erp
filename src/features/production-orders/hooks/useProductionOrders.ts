import { useQuery } from "@tanstack/react-query";
import { getProductionOrders } from "@/src/features/production-orders/services/actions";
import type { OrdenProduccion } from "@/src/features/production-orders/interfaces/production-order.interface";

export const useProductionOrders = () => {
  return useQuery<OrdenProduccion[]>({
    queryKey: ['production-orders'],
    queryFn: getProductionOrders,
  });
};
