import { v1_api } from "@/src/api/v1.api";
import type { Receipt, ReceiptDetail } from "../interfaces/receipt.interface";
import type { ReceiptOnboardingData, ReceiptCreatePayload } from "../interfaces/receipt-onboarding.interface";


// Listado COMPLETO de recepciones (todos los orígenes), sin `?limit=`: el
// backend responde el arreglo plano. Lo usa WMS. Compras ya no pasa por aquí:
// su tabla pide páginas de recepciones OC con `getPurchaseOrderReceiptsPage`.
export const getReceipts = async (): Promise<Receipt[]> => {
  const { data } = await v1_api.get<Receipt[]>("/compras/recepciones/");
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

/**
 * Cancela una recepción (`POST /compras/recepciones/{id}/cancelar/`, EC-925).
 * Responde la forma PLANA de `RecepcionSerializer` (como el listado, sin
 * `detalles` ni `puede_cancelar`), no la del retrieve: por eso quien la llama
 * invalida el detalle en vez de escribir esta respuesta en su caché.
 */
export const cancelReceipt = async ({
  id,
  motivo,
}: {
  id: number;
  motivo: string;
}): Promise<Receipt> => {
  const { data } = await v1_api.post<Receipt>(`/compras/recepciones/${id}/cancelar/`, { motivo });
  return data;
}
