import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPickings } from "../services/actions";
import type { Picking } from "../interfaces/picking.interface";

/**
 * Lista los pickings (`GET /wms/pickings/`). Llave `["pickings"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `useTransferencias`.
 */
export const usePickings = () => {
  const query = useQuery<Picking[]>({
    queryKey: ["pickings"],
    queryFn: getPickings,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "pickings-refetch-error",
  });

  return {
    pickings: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
