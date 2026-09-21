import { v1_api } from "@/src/api/v1.api";
import type {
  ProductOnboardingPayload,
  ProductOnboardingResult,
} from "../interfaces/product-onboarding.interface";

export const createProductOnboarding = async (
  payload: ProductOnboardingPayload,
): Promise<ProductOnboardingResult> => {
  const response = await v1_api.post<ProductOnboardingResult>(
    "/catalogo/producto/onboarding/",
    payload,
  );
  return response.data;
};
