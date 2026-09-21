import { v1_api } from "@/src/api/v1.api";
import type {
  ProductVariantOnboardingPayload,
  ProductVariantOnboardingResult,
} from "../interfaces/product-variant-onboarding.interface";

export const createProductVariantOnboarding = async (
  payload: ProductVariantOnboardingPayload,
): Promise<ProductVariantOnboardingResult> => {
  const response = await v1_api.post<ProductVariantOnboardingResult>(
    "/catalogo/producto-variante/onboarding/",
    payload,
  );
  return response.data;
};
