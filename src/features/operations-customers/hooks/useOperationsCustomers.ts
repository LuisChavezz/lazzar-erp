import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getOperationsCustomers } from "../services/actions";
import { OperationsCustomer } from "../interfaces/operations-customer.interface";

// NOTA: Este módulo duplica intencionalmente la estructura de
// accounting-customers en vez de compartir un mecanismo genérico de
// "lista de clientes filtrada por rol". Ambos consumen endpoints de
// backend distintos, pertenecen a equipos de negocio distintos
// (contabilidad vs. mesa de control), y es probable que sus necesidades
// de columnas/filtros diverjan con el tiempo. Fusionarlos hoy sería una
// abstracción prematura — se prefiere la duplicación actual, acotada y
// manejable, sobre el riesgo de una abstracción incorrecta que deba
// deshacerse después.
/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva la tabla y avisa
 * por toast (`useGuardedQuery`). `error` sigue la misma regla.
 */
export const useOperationsCustomers = () => {
  const { data, hasLoaded, isLoading, isInitialError, error, refetch, isFetching } =
    useGuardedQuery<OperationsCustomer[]>(
      {
        queryKey: ["operations-customers"],
        queryFn: getOperationsCustomers,
        gcTime: LIST_QUERY_GC_TIME,
      },
      { toastId: "operations-customers-refetch-error" },
    );

  return {
    customers: data ?? [],
    hasLoaded,
    isLoading,
    isInitialError,
    error,
    refetch,
    isFetching,
  };
};
