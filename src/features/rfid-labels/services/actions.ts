import { v1_api } from "@/src/api/v1.api";
import type { EtiquetaRFID } from "../interfaces/rfid-label.interface";
import type {
  RfidOnboardingParams,
  RfidOnboardingResponse,
  RfidRegisterPayload,
} from "../interfaces/rfid-onboarding.interface";

/**
 * Lista los eventos de impresión de etiquetas RFID (`GET /wms/etiquetas-rfid/`).
 *
 * Sin paginar y sin params de filtro documentados — el backend ya acota el
 * resultado a empresa/sucursal del usuario (`EtiquetaRFIDViewSet.get_queryset`).
 */
export const getEtiquetasRFID = async (): Promise<EtiquetaRFID[]> => {
  const response = await v1_api.get<EtiquetaRFID[]>("/wms/etiquetas-rfid/");
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
