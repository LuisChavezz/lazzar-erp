import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPackings } from "../services/actions";
import type { Packing } from "../interfaces/packing.interface";

/**
 * Lista los packings (`GET /wms/packings/`). Llave `["packings"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `usePickings`.
 */
export const usePackings = () => {
  const query = useQuery<Packing[]>({
    queryKey: ["packings"],
    queryFn: getPackings,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "packings-refetch-error",
  });

  return {
    packings: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
