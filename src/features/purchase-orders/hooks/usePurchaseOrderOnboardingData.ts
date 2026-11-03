import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPurchaseOrderOnboardingData } from "../services/actions";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";

/**
 * Catálogos del wizard de OC (`GET /compras/ordenes/onboarding/`). Un 4xx no se
 * reintenta: es el rechazo de un usuario sin empresa (`onboardingRejectionMessage`)
 * y la segunda petición respondería lo mismo.
 */
export const usePurchaseOrderOnboardingData = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<PurchaseOrderOnboardingData>(
    {
      queryKey: ["purchase-order-onboarding"],
      queryFn: getPurchaseOrderOnboardingData,
      gcTime: LIST_QUERY_GC_TIME,
      retry: retryUnlessClientError,
    },
    { toastId: "purchase-order-onboarding-refetch-error" },
  );

  return {
    onboardingData: data,
    isLoading,
    isInitialError,
    error,
  };
};
