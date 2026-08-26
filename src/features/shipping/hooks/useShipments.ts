import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getShipments } from "../services/actions";
import type { Shipment } from "../interfaces/shipping.interface";

/**
 * Lista los despachos (`GET /wms/despachos/`). Llave `["shipments"]`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `usePackings`.
 */
export const useShipments = () => {
  const query = useQuery<Shipment[]>({
    queryKey: ["shipments"],
    queryFn: getShipments,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "shipments-refetch-error",
  });

  return {
    shipments: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
