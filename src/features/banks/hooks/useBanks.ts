import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getBanks } from "../services/actions";
import { Banco } from "../interfaces/bank.interface";

/**
 * Catálogo de bancos. La respuesta es un arreglo plano (sin paginación), así que
 * el hook expone la lista completa y `DataTable` se encarga de buscar, filtrar y
 * paginar en memoria.
 */
export const useBanks = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Banco[]>({
    queryKey: ["banks"],
    queryFn: getBanks,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "banks-refetch-error",
  });

  return {
    banks: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
