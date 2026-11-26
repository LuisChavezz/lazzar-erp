import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type { ReceiptOnboardingData } from "@/src/features/receipts/interfaces/receipt-onboarding.interface";
import type {
  CreateRfidReconciliationPayload,
  RfidReconciliation,
  RfidReconciliationRead,
  RfidReconciliationRow,
} from "../interfaces/rfid-reconciliation.interface";

const BASE = "/compras/recepcion-rfid-encuadres/";

/**
 * Página del listado (`?limit=&offset=`, `?search=`, `?ordering=` y filtros).
 * Sin `limit` el endpoint respondería la lista completa: la tabla siempre lo
 * manda (`limitOffsetAdapter`).
 */
export const getRfidReconciliationsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<RfidReconciliationRow>> => {
  const { data } = await v1_api.get<PaginatedListResponse<RfidReconciliationRow>>(BASE, { params });
  return data;
};

export const getRfidReconciliation = async (id: number): Promise<RfidReconciliation> => {
  const { data } = await v1_api.get<RfidReconciliation>(`${BASE}${id}/`);
  return data;
};

/** OC/OP con algo por recibir y almacenes: la misma forma que `recepciones/onboarding/`. */
export const getRfidReconciliationOnboarding = async (): Promise<ReceiptOnboardingData> => {
  const { data } = await v1_api.get<ReceiptOnboardingData>(`${BASE}onboarding/`);
  return data;
};

/** Alta: `201` con el encuadre PENDIENTE y su resumen. */
export const createRfidReconciliation = async (
  payload: CreateRfidReconciliationPayload,
): Promise<RfidReconciliation> => {
  const { data } = await v1_api.post<RfidReconciliation>(BASE, payload);
  return data;
};

/**
 * Una lectura: `201` con la lectura nueva. `400 {"codigo_tag"}` si el tag ya se
 * leyó en este encuadre (también con dos envíos simultáneos) y
 * `400 {"estatus"}` si el encuadre ya no está PENDIENTE.
 */
export const addRfidReconciliationRead = async ({
  id,
  codigoTag,
}: {
  id: number;
  codigoTag: string;
}): Promise<RfidReconciliationRead> => {
  const { data } = await v1_api.post<RfidReconciliationRead>(`${BASE}${id}/lecturas/`, {
    codigo_tag: codigoTag,
  });
  return data;
};

/** Pasa a ACEPTADO (sin body). `400 {"estatus"}` si ya no está PENDIENTE. */
export const acceptRfidReconciliation = async (id: number): Promise<RfidReconciliation> => {
  const { data } = await v1_api.post<RfidReconciliation>(`${BASE}${id}/aceptar/`);
  return data;
};

/** Cancela con motivo (máx. 500). `400 {"estatus"}` si ya está cancelado. */
export const cancelRfidReconciliation = async ({
  id,
  motivo,
}: {
  id: number;
  motivo: string;
}): Promise<RfidReconciliation> => {
  const { data } = await v1_api.post<RfidReconciliation>(`${BASE}${id}/cancelar/`, { motivo });
  return data;
};
