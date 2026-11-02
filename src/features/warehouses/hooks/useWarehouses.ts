import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { LIST_QUERY_GC_TIME } from "@/src/constants/queryCache";
import { getWarehouses } from "../services/actions";
import { Warehouse } from "../interfaces/warehouse.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla.
 *
 * `data` se devuelve tal cual (`undefined` hasta la primera respuesta
 * exitosa): `StockView` y `StockEmptyState` distinguen con eso "aún no cargó"
 * de "cargó vacío".
 */
export const useWarehouses = () => {
  const { data, isLoading, isFetching, isInitialError, error, refetch } = useGuardedQuery<Warehouse[]>(
    {
      queryKey: ["warehouses"],
      queryFn: getWarehouses,
      gcTime: LIST_QUERY_GC_TIME,
    },
    { toastId: "warehouses-refetch-error" },
  );

  return {
    data,
    isLoading,
    isFetching,
    isInitialError,
    error,
    refetch,
  };
};
