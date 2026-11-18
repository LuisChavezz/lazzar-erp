import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getSalidasMaquila } from "../services/actions";
import type { SalidaMaquilaFilters } from "../interfaces/salida-maquila.interface";

/**
 * Id del toast de refetch fallido: uno por combinación de filtros, en orden
 * fijo, para que dos listas con filtros distintos no se dedupliquen entre sí.
 */
export const salidasMaquilaToastId = (filters: SalidaMaquilaFilters): string =>
  `salidas-maquila-refetch-error-op:${filters.op ?? "all"}-centro:${filters.centro_confeccion ?? "all"}-estatus:${filters.estatus ?? "all"}`;

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
    { toastId: salidasMaquilaToastId(filters) },
  );
  return { salidas: data ?? [], hasLoaded, isLoading, isFetching, isInitialError, error, refetch };
};
