import { v1_api } from "@/src/api/v1.api";
import type {
  GlobalSearchParams,
  GlobalSearchResponse,
} from "../interfaces/global-search.interface";

/**
 * Búsqueda global (`GET /search/`).
 *
 * Va por `v1_api` como cualquier otra llamada de feature: la cookie de sesión
 * vive en el dominio del backend, así que solo el navegador puede llamar a este
 * endpoint autenticado. El backend recorta los grupos por permiso del usuario.
 */
export const getGlobalSearch = async (
  params: GlobalSearchParams,
): Promise<GlobalSearchResponse> => {
  const response = await v1_api.get<GlobalSearchResponse>("/search/", {
    params: {
      q: params.q,
      limit: params.limit,
    },
  });
  return response.data;
};
