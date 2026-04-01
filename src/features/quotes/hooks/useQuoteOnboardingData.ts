import { useQuery } from "@tanstack/react-query";
import { getQuoteOnboardingData } from "../services/actions";

export const useQuoteOnboardingData = () => {
  return useQuery({
    queryKey: ["quote-onboarding"],
    queryFn: getQuoteOnboardingData,
  });
};
