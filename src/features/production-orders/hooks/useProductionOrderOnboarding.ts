import { useQuery } from "@tanstack/react-query";
import { getProductionOrderOnboarding } from "@/src/features/production-orders/services/actions";
import type { ProductionOrderOnboarding } from "@/src/features/production-orders/interfaces/production-order.interface";

export const useProductionOrderOnboarding = (op_id: number) => {
  return useQuery<ProductionOrderOnboarding>({
    queryKey: ['production-order-onboarding', op_id],
    queryFn: () => getProductionOrderOnboarding(op_id),
    enabled: op_id > 0,
  });
};
