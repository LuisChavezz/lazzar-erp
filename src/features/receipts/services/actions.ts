import { v1_api } from "@/src/api/v1.api";
import type { Receipt } from "../interfaces/receipt.interface";
import type { ReceiptOnboardingData, ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";


export const getReceipts = async (): Promise<Receipt[]> => {
  const { data } = await v1_api.get<Receipt[]>("/compras/recepciones/");
  return data;
}

export const getReceiptOnboargingData = async (): Promise<ReceiptOnboardingData> => {
  const { data } = await v1_api.get<ReceiptOnboardingData>("/compras/recepciones/onboarding/");
  return data;
}

export const createReceipt = async (
  payload: ReceiptCreatePayload,
): Promise<unknown> => {
  const { data } = await v1_api.post("/compras/recepciones/onboarding/", payload);
  return data;
}
