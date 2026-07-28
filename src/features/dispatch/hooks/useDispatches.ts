import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getDispatches } from "../services/actions";
import type { Dispatch } from "../interfaces/dispatch.interface";

/**
 * Lista los despachos (`GET /wms/despachos/`). Llave `["dispatches"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `usePackings`.
 */
export const useDispatches = () => {
  const query = useQuery<Dispatch[]>({
    queryKey: ["dispatches"],
    queryFn: getDispatches,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "dispatches-refetch-error",
  });

  return {
    dispatches: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
