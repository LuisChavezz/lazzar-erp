import { v1_api } from "@/src/api/v1.api";
import type { PurchaseNeed } from "@/src/features/pre-orders/interfaces/pre-order.interface";
import {
  normalizeNeedGroup,
  type PurchaseNeedGroup,
  type RawNeedGroup,
} from "../utils/normalizeNeedGroup";

/**
 * Necesidades pendientes agrupadas por material y sucursal
 * (`GET /compras/necesidades/agrupadas/`), ya ordenadas por urgencia.
 */
export const getNeedGroups = async (): Promise<PurchaseNeedGroup[]> => {
  const response = await v1_api.get<RawNeedGroup[]>("/compras/necesidades/agrupadas/");
  return response.data.map(normalizeNeedGroup);
};

export const getNeeds = async (params?: {
  estatus?: string;
  pre_orden?: number;
  producto?: number;
  orden_compra?: number;
}): Promise<PurchaseNeed[]> => {
  const response = await v1_api.get<PurchaseNeed[]>("/compras/necesidades/", { params });
  return response.data;
};

/**
 * Respuesta de `desde-necesidades/`. Su forma no está documentada: el id de
 * la OC puede venir arriba o dentro de `orden_compra`. Usar `createdOcId`.
 */
export interface CreateOcFromNeedsResponse {
  id?: number;
  folio?: string | null;
  orden_compra?: number | { id: number; folio?: string | null } | null;
  orden_compra_id?: number;
}

export const createdOcId = (res: CreateOcFromNeedsResponse): number | null => {
  if (typeof res.orden_compra === "object" && res.orden_compra) return res.orden_compra.id;
  return res.orden_compra_id ?? (typeof res.orden_compra === "number" ? res.orden_compra : null) ?? res.id ?? null;
};
export const createdOcFolio = (res: CreateOcFromNeedsResponse): string | null =>
  (typeof res.orden_compra === "object" && res.orden_compra ? res.orden_compra.folio : res.folio) ?? null;

/** Una sola OC en Borrador con las necesidades elegidas. */
export const createOcFromNeeds = async (body: {
  proveedor: number;
  necesidades: number[];
}): Promise<CreateOcFromNeedsResponse> => {
  const response = await v1_api.post<CreateOcFromNeedsResponse>(
    "/compras/ordenes/desde-necesidades/",
    body,
  );
  return response.data;
};
