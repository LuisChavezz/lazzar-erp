import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCobros } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * Listado de cobros. La respuesta es un arreglo plano (sin paginación), así que
 * el hook expone la lista completa y `DataTable` busca, filtra y pagina en
 * memoria.
 *
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido conserva los cobros y avisa por toast
 * (`useGuardedQuery`).
 */
export const useCobros = () => {
  const { data, isLoading, isFetching, isInitialError, error, refetch } = useGuardedQuery<Cobro[]>(
    {
      queryKey: ["cobros"],
      queryFn: () => getCobros(),
    },
    { toastId: "cobros-refetch-error" },
  );

  return {
    cobros: data ?? [],
    isLoading,
    isFetching,
    isInitialError,
    error,
    refetch,
  };
};
