import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getCorteMangaOnboarding } from "../services/actions";
import type { CorteMangaOnboardingData } from "../interfaces/corte-manga-order.interface";

/**
 * Ventana durante la cual la respuesta se considera fresca.
 *
 * NO es 0 con `refetchOnMount: "always"`: la respuesta trae todos los pedidos
 * candidatos con sus líneas, y un GET completo en cada montaje sería puro
 * desperdicio. Los cinco segundos no relajan la garantía real: el backend
 * revalida en el POST. Mismo número y mismo criterio que
 * `useEmbroideryOnboarding` y `useReflectiveOnboarding`.
 */
const CORTE_MANGA_ONBOARDING_STALE_TIME = 5_000;

/**
 * Catálogos de alta de orden de corte de manga
 * (`GET /produccion/orden-corte-manga/onboarding/`). Llave
 * `["corte-manga-onboarding"]`.
 *
 * DESVIACIÓN DELIBERADA del `staleTime` global (15 min). Este hook lo usaba
 * tratando la respuesta como "una lista de pedidos con corte de manga y de
 * usuarios activos", tan estable como cualquier catálogo. Dejó de serlo: el
 * backend arma los tres onboardings de órdenes de trabajo (OB, OR, OCM) con el
 * mismo constructor, y cada pedido trae ahora su detalle POR TALLA
 * (`detalles[]` con `cantidad_asignada`/`cantidad_pendiente`) y lo que Mesa de
 * Control programó (`programado`) — datos que otra OCM del mismo pedido u otro
 * usuario cambian en cualquier momento. Servir eso desde caché por 15 minutos
 * mostraría un estado que ya no existe.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar el panel de error)
 * de un refetch fallido con datos en caché, que debe CONSERVAR el formulario
 * —con lo ya capturado— y avisar por toast. Con la ventana de 5 s los refetch
 * son frecuentes, así que sin esta distinción un fallo de red cualquiera
 * cambiaba el formulario por el panel de error. Mismo patrón que
 * `useEmbroideryOnboarding` y `useReflectiveOnboarding`.
 *
 * OJO con `folioPreview`: es APROXIMADO (se calcula con la sucursal por defecto
 * del usuario, no con la del pedido). Quien lo pinte debe rotularlo como tal —
 * ver `CorteMangaOnboardingData`.
 */
/**
 * Exportada porque "Programar pedido" (feature `orders`) la invalida: cada
 * pedido del onboarding trae su `programado` de Mesa de Control.
 */
export const corteMangaOnboardingQueryKey = ["corte-manga-onboarding"] as const;

export const useCorteMangaOnboarding = () => {
  const query = useQuery<CorteMangaOnboardingData>({
    queryKey: corteMangaOnboardingQueryKey,
    queryFn: getCorteMangaOnboarding,
    staleTime: CORTE_MANGA_ONBOARDING_STALE_TIME,
    gcTime: 30_000,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    errorUpdatedAt: query.errorUpdatedAt,
    toastId: "corte-manga-onboarding-refetch-error",
    errorMessage:
      "No se pudieron actualizar los pendientes del pedido. Mostrando los datos anteriores.",
  });

  return {
    data: query.data,
    pedidos: query.data?.pedidos ?? [],
    operadores: query.data?.operadores ?? [],
    folioPreview: query.data?.preview?.folio_ocm_sugerido ?? null,
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
