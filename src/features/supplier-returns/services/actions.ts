import { v1_api } from "@/src/api/v1.api";
import type { PaginatedListResponse } from "@/src/utils/serverListAdapters";
import type {
  CreateSupplierReturnPayload,
  SupplierReturn,
  SupplierReturnPendingLine,
} from "../interfaces/supplier-return.interface";

const BASE = "/compras/devoluciones-proveedor/";

/**
 * Página del listado (`?limit=&offset=`, `?search=`, `?ordering=` y filtros).
 * Sin `limit` el endpoint respondería la lista completa: la tabla siempre lo
 * manda (`limitOffsetAdapter`).
 */
export const getSupplierReturnsPage = async (
  params: Record<string, string | number>,
): Promise<PaginatedListResponse<SupplierReturn>> => {
  const { data } = await v1_api.get<PaginatedListResponse<SupplierReturn>>(BASE, { params });
  return data;
};

export const getSupplierReturn = async (id: number): Promise<SupplierReturn> => {
  const { data } = await v1_api.get<SupplierReturn>(`${BASE}${id}/`);
  return data;
};

/** Lo que falta devolver de una inspección (400 `calidad_inspeccion` si no es de la empresa). */
export const getSupplierReturnPendientes = async (
  inspectionId: number,
): Promise<SupplierReturnPendingLine[]> => {
  const { data } = await v1_api.get<SupplierReturnPendingLine[]>(`${BASE}pendientes/`, {
    params: { calidad_inspeccion: inspectionId },
  });
  return data;
};

/** Alta: `201` con el documento ya aplicado. */
export const createSupplierReturn = async (
  payload: CreateSupplierReturnPayload,
): Promise<SupplierReturn> => {
  const { data } = await v1_api.post<SupplierReturn>(BASE, payload);
  return data;
};

/** Cancela con motivo: `200` con el documento cancelado; ya cancelada → `400 {"estatus"}`. */
export const cancelSupplierReturn = async ({
  id,
  motivo,
}: {
  id: number;
  motivo: string;
}): Promise<SupplierReturn> => {
  const { data } = await v1_api.post<SupplierReturn>(`${BASE}${id}/cancelar/`, { motivo });
  return data;
};
