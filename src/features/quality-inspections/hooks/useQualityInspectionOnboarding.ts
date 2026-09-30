import { useQuery } from "@tanstack/react-query";
import { getQualityInspectionOnboarding } from "../services/actions";
import type { QualityInspectionOnboardingData } from "../interfaces/quality-inspection.interface";

export const QUALITY_INSPECTION_ONBOARDING_KEY = ["quality-inspection-onboarding"] as const;

export const useQualityInspectionOnboarding = () => {
  return useQuery<QualityInspectionOnboardingData>({
    queryKey: QUALITY_INSPECTION_ONBOARDING_KEY,
    queryFn: () => getQualityInspectionOnboarding(),
  });
};
