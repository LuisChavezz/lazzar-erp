import { v1_api } from "@/src/api/v1.api";
import type { ReceiptOnboardingData } from "../interfaces/receipt-onboarding.interface";


export const getReceiptOnboargingData = async (): Promise<ReceiptOnboardingData> => {
  const { data } = await v1_api.get<ReceiptOnboardingData>("/compras/recepciones/onboarding/");
  return data;
}