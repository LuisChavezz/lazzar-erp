import { queryOptions, useQuery } from "@tanstack/react-query";
import { getQuoteOnboardingData } from "../services/actions";

export const getQuoteOnboardingDataQueryOptions = () =>
  queryOptions({
    queryKey: ["quote-onboarding"],
    queryFn: getQuoteOnboardingData,
  });

export const useQuoteOnboardingData = () => {
  return useQuery(getQuoteOnboardingDataQueryOptions());
};
