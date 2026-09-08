import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getNotasCredito } from "../services/actions";
import type { NotaCredito } from "../interfaces/credit-note.interface";

/**
 * Listado de notas de crédito. La respuesta es un arreglo plano (sin
 * paginación), así que el hook expone la lista completa y `DataTable` se encarga
 * de buscar, filtrar y paginar en memoria. Mismo molde que `usePagos`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar el estado de error de
 * la tabla) de un refetch fallido con datos en caché (un toast y conservar la
 * vista).
 */
export const useNotasCredito = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    NotaCredito[]
  >({
    queryKey: ["credit-notes"],
    queryFn: getNotasCredito,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "credit-notes-refetch-error",
  });

  return {
    notasCredito: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
