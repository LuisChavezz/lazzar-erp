import { useQuery } from "@tanstack/react-query";
import { getEmbroideryOnboarding } from "../services/actions";
import type { EmbroideryOnboardingData } from "../interfaces/embroidery.interface";

/**
 * Catálogos de alta de orden de bordado
 * (`GET /produccion/orden-bordado/onboarding/`). Llave
 * `["embroidery-onboarding"]`.
 *
 * Usa el `staleTime` global (15 min) sin desviaciones, a diferencia de
 * `useDispatchOnboarding`/`usePackingOnboarding`: aquellos bajan el
 * `staleTime` a 0 porque su respuesta trae elegibilidad POR LÍNEA que otro
 * operador puede invalidar en cualquier momento (`ya_despachado`). Aquí no hay
 * nada equivalente — el catálogo es una lista de pedidos con bordado y de
 * usuarios activos, ambos tan estables como cualquier otro catálogo del
 * proyecto.
 */
export const useEmbroideryOnboarding = () => {
  const query = useQuery<EmbroideryOnboardingData>({
    queryKey: ["embroidery-onboarding"],
    queryFn: getEmbroideryOnboarding,
  });

  return {
    data: query.data,
    pedidos: query.data?.pedidos ?? [],
    operadores: query.data?.operadores ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
