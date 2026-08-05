import { useQuery } from "@tanstack/react-query";
import { getReflectiveOnboarding } from "../services/actions";
import type { ReflectiveOnboardingData } from "../interfaces/reflective-order.interface";

/**
 * Catálogos de alta de orden de reflejante
 * (`GET /produccion/orden-reflejante/onboarding/`). Llave
 * `["reflective-onboarding"]`.
 *
 * Usa el `staleTime` global (15 min) sin desviaciones, a diferencia de
 * `useDispatchOnboarding`/`usePackingOnboarding`: aquellos bajan el `staleTime`
 * a 0 porque su respuesta trae elegibilidad POR LÍNEA que otro operador puede
 * invalidar en cualquier momento. Aquí no hay nada equivalente — el catálogo es
 * una lista de pedidos con reflejante y de usuarios activos, ambos tan estables
 * como cualquier otro catálogo del proyecto.
 *
 * OJO con `folioPreview`: es APROXIMADO (se calcula con la sucursal por defecto
 * del usuario, no con la del pedido). Quien lo pinte debe rotularlo como tal —
 * ver `ReflectiveOnboardingData`.
 */
export const useReflectiveOnboarding = () => {
  const query = useQuery<ReflectiveOnboardingData>({
    queryKey: ["reflective-onboarding"],
    queryFn: getReflectiveOnboarding,
  });

  return {
    data: query.data,
    pedidos: query.data?.pedidos ?? [],
    operadores: query.data?.operadores ?? [],
    folioPreview: query.data?.preview?.folio_or_sugerido ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
