import { useQuery } from "@tanstack/react-query";
import { getCorteMangaOnboarding } from "../services/actions";
import type { CorteMangaOnboardingData } from "../interfaces/corte-manga-order.interface";

/**
 * Catálogos de alta de orden de corte de manga
 * (`GET /produccion/orden-corte-manga/onboarding/`). Llave
 * `["corte-manga-onboarding"]`.
 *
 * Usa el `staleTime` global (15 min) sin desviaciones, a diferencia de
 * `useDispatchOnboarding`/`usePackingOnboarding`: aquellos bajan el `staleTime`
 * a 0 porque su respuesta trae elegibilidad POR LÍNEA que otro operador puede
 * invalidar en cualquier momento. Aquí no hay nada equivalente — el catálogo es
 * una lista de pedidos con corte de manga y de usuarios activos, ambos tan
 * estables como cualquier otro catálogo del proyecto.
 *
 * OJO con `folioPreview`: es APROXIMADO (se calcula con la sucursal por defecto
 * del usuario, no con la del pedido). Quien lo pinte debe rotularlo como tal —
 * ver `CorteMangaOnboardingData`.
 */
export const useCorteMangaOnboarding = () => {
  const query = useQuery<CorteMangaOnboardingData>({
    queryKey: ["corte-manga-onboarding"],
    queryFn: getCorteMangaOnboarding,
  });

  return {
    data: query.data,
    pedidos: query.data?.pedidos ?? [],
    operadores: query.data?.operadores ?? [],
    folioPreview: query.data?.preview?.folio_ocm_sugerido ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
