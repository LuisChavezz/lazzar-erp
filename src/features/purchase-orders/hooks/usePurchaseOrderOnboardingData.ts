import { useQuery } from "@tanstack/react-query";
import { PROCUREMENT_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getPurchaseOrderOnboardingData } from "../services/actions";
import type { PurchaseOrderOnboardingData } from "../interfaces/purchase-order-onboarding.interface";

export const usePurchaseOrderOnboardingData = () => {
  const {
    data: onboardingData,
    isLoading,
    isError,
    error,
  } = useQuery<PurchaseOrderOnboardingData>({
    queryKey: ["purchase-order-onboarding"],
    queryFn: getPurchaseOrderOnboardingData,
    gcTime: PROCUREMENT_QUERY_GC_TIME,
  });

  return {
    onboardingData,
    isLoading,
    isError,
    error,
  };
};
