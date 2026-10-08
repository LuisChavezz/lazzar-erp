import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getProductionOrderKpis } from "@/src/features/production-orders/services/actions";
import type { ProductionOrderKpis } from "@/src/features/production-orders/interfaces/production-order-kpis.interface";

/**
 * Llave propia, fuera de `["production-orders"]`: los indicadores no se
 * derivan del listado y una mutación de OP no tiene por qué refetchearlos.
 */
export const productionOrderKpisQueryKey = ["production-order-kpis"] as const;

/**
 * Indicadores de OP (`GET /produccion/orden-produccion/kpis/`).
 *
 * `refetchOnMount: "always"`: el backend los CALCULA en cada lectura a partir
 * de OPs que cambian en otras pantallas; con el `staleTime` global de 15 min,
 * volver al dashboard mostraría cifras viejas. Mismo criterio que
 * `usePedidoTrazabilidad`.
 *
 * Un refetch fallido con datos en caché los conserva y avisa por toast; solo un
 * fallo SIN datos (`isInitialError`) se pinta como error en la sección.
 */
export const useProductionOrderKpis = () => {
  const { data, isError, isFetching, errorUpdatedAt, refetch } = useQuery<ProductionOrderKpis>({
    queryKey: productionOrderKpisQueryKey,
    queryFn: () => getProductionOrderKpis(),
    refetchOnMount: "always",
  });

  const { hasLoaded, isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "production-order-kpis-refetch-error",
    errorMessage: "No se pudieron actualizar los indicadores. Mostrando datos anteriores.",
  });

  return { data, hasLoaded, isInitialError, isFetching, refetch };
};
