import { v1_api } from "@/src/api/v1.api";
import type {
  CreateQualityInspectionPayload,
  CreateQualityInspectionResponse,
  QualityInspectionOnboardingData,
} from "../interfaces/quality-inspection.interface";

// Recepciones en `EN_CALIDAD` de la empresa (máx. 50) + catálogo de inspectores.
export const getQualityInspectionOnboarding =
  async (): Promise<QualityInspectionOnboardingData> => {
    const { data } = await v1_api.get<QualityInspectionOnboardingData>(
      "/compras/calidad-inspecciones/onboarding/",
    );
    return data;
  };

// Inspecciona TODA la recepción: abona a existencias lo aprobado y la cierra
// (`CERRADA`). Responde 200, no 201.
export const createQualityInspection = async (
  payload: CreateQualityInspectionPayload,
): Promise<CreateQualityInspectionResponse> => {
  const { data } = await v1_api.post<CreateQualityInspectionResponse>(
    "/compras/calidad-inspecciones/onboarding/",
    payload,
  );
  return data;
};
