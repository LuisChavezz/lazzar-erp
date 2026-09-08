import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPagos } from "../services/actions";
import { Pago } from "../interfaces/payment.interface";

/**
 * Listado de pagos a proveedor. La respuesta es un arreglo plano (sin
 * paginación), así que el hook expone la lista completa y `DataTable` se encarga
 * de buscar, filtrar y paginar en memoria. Mismo molde que `useBanks`.
 */
export const usePagos = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Pago[]>({
    queryKey: ["pagos"],
    queryFn: getPagos,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "pagos-refetch-error",
  });

  return {
    pagos: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
