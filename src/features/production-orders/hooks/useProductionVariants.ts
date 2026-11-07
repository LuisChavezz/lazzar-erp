import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getProductionVariants } from "../services/actions";
import type { ProductionVariantOption } from "../interfaces/production-order.interface";

/** Variantes de producción (muestras) para el onboarding de OP. Llave `["production-variants"]`. */
export const useProductionVariants = () => {
  const { data, isLoading, isInitialError } = useGuardedQuery<ProductionVariantOption[]>(
    { queryKey: ["production-variants"], queryFn: getProductionVariants },
    { toastId: "production-variants-refetch-error" },
  );
  return { productionVariants: data ?? [], isLoading, isInitialError };
};
