import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getTransferencias } from "../services/actions";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";

/**
 * Lista los traspasos (`GET /wms/transferencias/`). Llave `["transferencias"]`
 * — es el mismo prefijo que invalida `useCreateStockTransfer` al crear uno
 * nuevo, así que el listado se refresca solo tras registrar un traspaso.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar `ErrorState`) de un
 * refetch fallido con datos en caché (toast + conservar la tabla). Mismo
 * patrón que `useCuentasPorCobrar`.
 */
export const useTransferencias = () => {
  const query = useQuery<TransferenciaListItem[]>({
    queryKey: ["transferencias"],
    queryFn: getTransferencias,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "transferencias-refetch-error",
  });

  return {
    transferencias: query.data ?? [],
    hasLoaded,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
