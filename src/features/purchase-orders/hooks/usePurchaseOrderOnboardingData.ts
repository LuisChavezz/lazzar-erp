import { useQuery } from "@tanstack/react-query";
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
  });

  return {
    onboardingData,
    isLoading,
    isError,
    error,
  };
};
