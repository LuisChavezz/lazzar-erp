import { v1_api } from "@/src/api/v1.api";
import type { Receipt, ReceiptDetail } from "../interfaces/receipt.interface";
import type { ReceiptOnboardingData, ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";


// Acción compartida: WMS la consume sin filtro (todas las recepciones) y
// Compras la reutiliza pasando `tipo_origen: "OC"`. El parámetro solo se
// envía cuando se especifica, por lo que la llamada sin argumentos de WMS
// mantiene un comportamiento idéntico al anterior.
export const getReceipts = async (
  tipo_origen?: "OC" | "OP",
): Promise<Receipt[]> => {
  const { data } = await v1_api.get<Receipt[]>("/compras/recepciones/", {
    params: tipo_origen ? { tipo_origen } : undefined,
  });
  return data;
}

// Detalle de una recepción individual. Acción compartida: WMS, Producción y
// Compras consumen la misma respuesta (el shape no varía por tipo_origen).
export const getReceiptDetail = async (id: number): Promise<ReceiptDetail> => {
  const { data } = await v1_api.get<ReceiptDetail>(`/compras/recepciones/${id}/`);
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
