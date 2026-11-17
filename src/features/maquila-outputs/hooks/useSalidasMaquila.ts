import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSalidasMaquila } from "../services/actions";
import type { SalidaMaquilaFilters } from "../interfaces/salida-maquila.interface";

/**
 * Salidas a maquila (`GET /produccion/salidas-maquila/`). Llave
 * `["salidas-maquila", filtros]`; las mutaciones invalidan por el prefijo.
 */
export const useSalidasMaquila = (filters: SalidaMaquilaFilters = {}, enabled = true) => {
  const { data, hasLoaded, isLoading, isFetching, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: ["salidas-maquila", filters],
      queryFn: () => getSalidasMaquila(filters),
      enabled,
    },
    { toastId: `salidas-maquila-refetch-error-${filters.op ?? "all"}` },
  );
  return { salidas: data ?? [], hasLoaded, isLoading, isFetching, isInitialError, error, refetch };
};
