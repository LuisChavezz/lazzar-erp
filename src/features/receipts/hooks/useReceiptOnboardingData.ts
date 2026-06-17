import { useQuery } from "@tanstack/react-query";
import { getReceiptOnboargingData } from "../services/actions";
import type { ReceiptOnboardingData } from "../interfaces/receipt-onboarding.interface";

export const useReceiptOnboardingData = () => {
  const {
    data: onboardingData,
    isLoading,
    isError,
    error,
  } = useQuery<ReceiptOnboardingData>({
    queryKey: ["receipt-onboarding-data"],
    queryFn: getReceiptOnboargingData,
  });

  return {
    onboardingData,
    isLoading,
    isError,
    error,
  };
};
