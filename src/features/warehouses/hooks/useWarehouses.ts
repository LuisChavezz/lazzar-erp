import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getWarehouses } from "../services/actions";
import { Warehouse } from "../interfaces/warehouse.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla.
 *
 * `data` se devuelve tal cual (`undefined` hasta la primera respuesta
 * exitosa): `StockView` y `StockEmptyState` distinguen con eso "aún no cargó"
 * de "cargó vacío".
 */
export const useWarehouses = () => {
  const { data, isLoading, isError, error, errorUpdatedAt, refetch } = useQuery<Warehouse[]>({
    queryKey: ["warehouses"],
    queryFn: getWarehouses,
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "warehouses-refetch-error",
  });

  return {
    data,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
    refetch,
  };
};
