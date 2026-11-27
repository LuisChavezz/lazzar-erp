import { v1_api } from "@/src/api/v1.api";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";
import type { RfidLabelsListResponse } from "../utils/rfidLabelsAdapter";
import type {
  RfidOnboardingParams,
  RfidOnboardingResponse,
  RfidRegisterPayload,
} from "../interfaces/rfid-onboarding.interface";

/**
 * Historial de impresiones (`GET /wms/etiquetas-rfid/`), con los parámetros
 * que arma `useServerTable` (`limit`/`offset`, `search`, `status`, `ordering`).
 *
 * Responde dos formas según el backend: el arreglo completo (antes de EC-989,
 * que ignora los parámetros) o la página `{count, next, previous, results}`
 * (desde EC-989). `rfidLabelsAdapter` entiende las dos. El backend acota el
 * resultado a la empresa/sucursales del usuario.
 */
export const getEtiquetasRFIDPage = async (
  params: Record<string, string | number>,
): Promise<RfidLabelsListResponse> => {
  const response = await v1_api.get<RfidLabelsListResponse>("/wms/etiquetas-rfid/", { params });
  return response.data;
};

/** Detalle de UNA impresión (`GET /wms/etiquetas-rfid/{id}/`), con sus EPC y su ZPL. */
export const getEtiquetaRFID = async (id: number): Promise<EtiquetaRFID> => {
  const response = await v1_api.get<EtiquetaRFID>(`/wms/etiquetas-rfid/${id}/`);
  return response.data;
};

/**
 * Onboarding de impresión (`GET /wms/etiquetas-rfid/onboarding/`): buscador y,
 * si se pasa `variante`/`producto`, la vista previa con `zpl_individual[]`.
 * Un solo endpoint para búsqueda y preview (ver contrato en
 * `rfid-onboarding.interface.ts`).
 */
export const getRfidLabelOnboarding = async (
  params: RfidOnboardingParams,
): Promise<RfidOnboardingResponse> => {
  const response = await v1_api.get<RfidOnboardingResponse>(
    "/wms/etiquetas-rfid/onboarding/",
    {
      params: {
        q: params.q || undefined,
        variante: params.variante ?? undefined,
        producto: params.producto ?? undefined,
        cantidad: params.cantidad ?? undefined,
        // El backend lee `rfid_mode` como string; solo enviarlo cuando es
        // relevante (hay selección). Con `false` explícito para desactivarlo.
        rfid_mode:
          params.rfid_mode === undefined ? undefined : String(params.rfid_mode),
      },
    },
  );
  return response.data;
};

/**
 * Registra el resultado de una impresión (`POST /wms/etiquetas-rfid/onboarding/`).
 * Mismo `store_impresion` que `registrar-impresion`: hereda el rechazo de
 * EPC duplicado (409 en carrera, 400 en pre-chequeo) y de sucursal faltante
 * (400). Responde el registro creado (`EtiquetaRFID`).
 */
export const registrarRfidLabelImpresion = async (
  payload: RfidRegisterPayload,
): Promise<EtiquetaRFID> => {
  const response = await v1_api.post<EtiquetaRFID>(
    "/wms/etiquetas-rfid/onboarding/",
    payload,
  );
  return response.data;
};
