import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getPolizas } from "../services/actions";
import type { Poliza } from "../interfaces/poliza.interface";

/**
 * Listado de pólizas. La respuesta es un arreglo plano (sin paginación), así que
 * el hook expone la lista completa y `DataTable` se encarga de buscar, filtrar y
 * paginar en memoria. Mismo molde que `usePagos` y `useNotasCredito`.
 *
 * `hasLoaded` distingue una carga inicial fallida (mostrar el estado de error de
 * la tabla) de un refetch fallido con datos en caché (un toast y conservar la
 * vista).
 */
export const usePolizas = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<Poliza[]>(
    {
      queryKey: ["polizas"],
      queryFn: getPolizas,
    },
  );

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "polizas-refetch-error",
  });

  return {
    polizas: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
