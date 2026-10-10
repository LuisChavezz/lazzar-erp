import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getLocations } from "../services/actions";
import { Location } from "../interfaces/location.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useWarehouses` (`data` tal cual, `undefined` hasta cargar).
 */
export const useLocations = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Location[]>({
    queryKey: ["locations"],
    queryFn: getLocations,
  });

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "locations-refetch-error",
  });

  return {
    data,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
