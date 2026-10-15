import { useQuery } from "@tanstack/react-query";
import { getProductionOrderOnboarding } from "@/src/features/production-orders/services/actions";
import type { ProductionOrderOnboarding } from "@/src/features/production-orders/interfaces/production-order.interface";

/** Llave del detalle de una OP; la usan las mutaciones que lo invalidan. */
export const productionOrderOnboardingKey = (opId: number) =>
  ["production-order-onboarding", opId] as const;

export const useProductionOrderOnboarding = (op_id: number) => {
  return useQuery<ProductionOrderOnboarding>({
    queryKey: productionOrderOnboardingKey(op_id),
    queryFn: () => getProductionOrderOnboarding(op_id),
    enabled: op_id > 0,
  });
};
