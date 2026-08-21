import { v1_api } from "@/src/api/v1.api";
import type {
  ClearRfidScansResponse,
  RfidScannerStatsResponse,
  RfidScansResponse,
} from "../interfaces/rfid-scanner.interface";

/**
 * Últimas 50 lecturas del lector RFID, ya cruzadas contra las etiquetas
 * impresas (`GET /wms/etiquetas-rfid/scans/`).
 *
 * Sin params: los que acepta (`?epc=`) solo alimentan `debug_get`, que esta
 * pantalla no consume. El backend acota el cruce a empresa/sucursales del
 * usuario, así que una lectura de otra empresa llega con `match_impresion:
 * false` en vez de filtrarse.
 */
export const fetchRfidScans = async (): Promise<RfidScansResponse> => {
  const response = await v1_api.get<RfidScansResponse>("/wms/etiquetas-rfid/scans/");
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
 * DESTRUCTIVO Y GLOBAL: hace `RfidScan.objects.all().delete()` — sin filtro por
 * empresa, sucursal ni fecha, porque el modelo todavía no tiene FK a empresa.
 * Un administrador borra también las lecturas de las demás empresas del ERP.
 *
 * El backend lo restringe a superusuario o administrador de empresa y responde
 * 403 `{ detail }` a cualquier otro usuario — esa es la frontera real; el gate
 * de la UI (ver `RfidScannerView`) solo evita ofrecer un botón que fallaría.
 */
export const clearRfidScans = async (): Promise<ClearRfidScansResponse> => {
  const response = await v1_api.post<ClearRfidScansResponse>(
    "/wms/etiquetas-rfid/scans/clear/",
  );
  return response.data;
};
