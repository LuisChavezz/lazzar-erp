import { v1_api } from "@/src/api/v1.api";
import type {
  ClearRfidScansResponse,
  RfidScannerStatsResponse,
  RfidScansResponse,
  CreateRfidLectorPayload,
  RfidLectorConfig,
} from "../interfaces/rfid-scanner.interface";

import { rfidScansQueryParams, type RfidScansParams } from "../utils/rfidScansParams";

export type { RfidScansParams };

/**
 * Últimas lecturas del lector RFID, ya cruzadas contra las etiquetas
 * impresas (`GET /wms/etiquetas-rfid/scans/`).
 *
 * Siempre pide `unicos=1` (la última lectura de cada EPC): el FX repite la
 * misma etiqueta varias veces por segundo y, sin deduplicar, las etiquetas
 * ajenas de alrededor llenaban el límite de 50 y empujaban fuera las del ERP.
 * `solo_match=1` deja solo las impresas por el ERP. Un backend sin #1331
 * ignora ambos params y responde como antes.
 *
 * El backend devuelve las 50 lecturas más recientes, coincidan o no: las que
 * no cruzan con una etiqueta impresa llegan con `match_impresion: false` (p.
 * ej. tags ajenos `3035…`) en vez de descartarse (EC-786). Los EPC llegan en
 * mayúsculas. Con `despuesDeId` (EC-982) solo las posteriores a ese `id`
 * (`useRfidCursorScans`).
 */
export const fetchRfidScans = async (params: RfidScansParams): Promise<RfidScansResponse> => {
  const response = await v1_api.get<RfidScansResponse>("/wms/etiquetas-rfid/scans/", {
    params: rfidScansQueryParams(params),
  });
  return response.data;
};

/**
 * Estado del lector (`GET /wms/etiquetas-rfid/scanner-stats/`): total de
 * lecturas almacenadas y hace cuánto llegó la última.
 */
export const fetchScannerStats = async (): Promise<RfidScannerStatsResponse> => {
  const response = await v1_api.get<RfidScannerStatsResponse>(
    "/wms/etiquetas-rfid/scanner-stats/",
  );
  return response.data;
};

/**
 * Vacía el buffer de lecturas (`POST /wms/etiquetas-rfid/scans/clear/`).
 *
 * DESTRUCTIVO: borra TODAS las lecturas de la empresa activa del usuario, de
 * todas sus sucursales y sin filtro de fecha (`RfidScan.objects.visibles_para`,
 * EC-884). No toca las de otras empresas ni las que no tienen empresa (tags
 * ajenos sin lector); esas solo se borran desde el Django admin. Un
 * superusuario sin empresa activa recibe 200 con `deleted: 0`.
 *
 * El backend lo restringe a superusuario o administrador de empresa y responde
 * 403 `{ detail }` a cualquier otro usuario — esa es la frontera real; el gate
 * de la UI (`useIsCompanyAdmin` en `RfidScannerView`) solo evita ofrecer un
 * botón que fallaría. No depende de ningún código del catálogo de permisos.
 */
export const clearRfidScans = async (): Promise<ClearRfidScansResponse> => {
  const response = await v1_api.post<ClearRfidScansResponse>(
    "/wms/etiquetas-rfid/scans/clear/",
  );
  return response.data;
};

/** Lectores RFID de la empresa (`GET /wms/etiquetas-rfid/lectores/`). Acepta lista o página DRF. */
export const fetchRfidLectores = async (): Promise<RfidLectorConfig[]> => {
  const response = await v1_api.get<RfidLectorConfig[] | { results: RfidLectorConfig[] }>(
    "/wms/etiquetas-rfid/lectores/",
  );
  const data = response.data;
  return Array.isArray(data) ? data : (data?.results ?? []);
};

/** Alta de lector: el backend genera su token y responde con `url_fx`. */
export const createRfidLector = async (
  payload: CreateRfidLectorPayload,
): Promise<RfidLectorConfig> => {
  const response = await v1_api.post<RfidLectorConfig>("/wms/etiquetas-rfid/lectores/", payload);
  return response.data;
};

/** Baja de lector: su token deja de funcionar. */
export const deleteRfidLector = async (id: number): Promise<void> => {
  await v1_api.delete(`/wms/etiquetas-rfid/lectores/${id}/`);
};

/**
 * Latido de "lector en uso" (`POST /lectores/{id}/en-uso/`): mientras una
 * pantalla escanea con un lector, avisa cada ~30 s quién lo usa y dónde, para
 * que otros usuarios lo vean en el selector. Informativo: no aparta el lector.
 */
export const marcarLectorEnUso = async (
  id: number,
  body: { pantalla: string; documento?: string | null },
): Promise<void> => {
  await v1_api.post(`/wms/etiquetas-rfid/lectores/${id}/en-uso/`, body);
};

/** Nuevo token del lector (solo admin). La respuesta trae `url_fx` completa, una sola vez. */
export const regenerarTokenRfidLector = async (id: number): Promise<RfidLectorConfig> => {
  const response = await v1_api.post<RfidLectorConfig>(
    `/wms/etiquetas-rfid/lectores/${id}/regenerar-token/`,
  );
  return response.data;
};
