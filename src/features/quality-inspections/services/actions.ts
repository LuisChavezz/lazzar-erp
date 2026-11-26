import { v1_api } from "@/src/api/v1.api";
import type {
  CreateQualityInspectionPayload,
  CreateQualityInspectionResponse,
  QualityInspection,
  QualityInspectionOnboardingData,
  RevertQualityInspectionResponse,
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

// Revierte una inspección liberada por error (EC-947, solo admin de empresa o
// superusuario): saca del almacén lo que entró, la inspección queda `anulada` y
// la recepción vuelve a En calidad. Motivo obligatorio.
export const revertQualityInspection = async ({
  id,
  motivo,
}: {
  id: number;
  motivo: string;
}): Promise<RevertQualityInspectionResponse> => {
  const { data } = await v1_api.post<RevertQualityInspectionResponse>(
    `/compras/calidad-inspecciones/${id}/revertir/`,
    { motivo },
  );
  return data;
};

// Inspecciones con algo rechazado o en cuarentena aún sin devolver al proveedor
// (`?devolucion_pendiente=true`, nucleo-erp#1413): el selector de "Nueva
// devolución". Acción aparte de `getQualityInspections`, que va como `queryFn`
// directo y recibiría el contexto de la consulta como parámetro.
export const getReturnableQualityInspections = async (): Promise<QualityInspection[]> => {
  const { data } = await v1_api.get<QualityInspection[] | { results: QualityInspection[] }>(
    "/compras/calidad-inspecciones/",
    { params: { devolucion_pendiente: true } },
  );
  return Array.isArray(data) ? data : data.results;
};

// Inspecciones ya registradas (historial), con sus renglones.
export const getQualityInspections = async (): Promise<QualityInspection[]> => {
  const { data } = await v1_api.get<QualityInspection[] | { results: QualityInspection[] }>(
    "/compras/calidad-inspecciones/",
  );
  return Array.isArray(data) ? data : data.results;
};
