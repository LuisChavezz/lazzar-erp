import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
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
export const useOperationsCustomers = () => {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<
    OperationsCustomer[]
  >({
    queryKey: ["operations-customers"],
    queryFn: getOperationsCustomers,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data,
    isError,
    toastId: "operations-customers-refetch-error",
  });

  return {
    customers: data ?? [],
    hasLoaded,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
