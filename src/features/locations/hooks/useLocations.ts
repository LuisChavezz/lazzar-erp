import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getLocations } from "../services/actions";
import { Location } from "../interfaces/location.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useWarehouses` (`data` tal cual, `undefined` hasta cargar).
 */
export const useLocations = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Location[]>(
    {
      queryKey: ["locations"],
      queryFn: getLocations,
    },
    { toastId: "locations-refetch-error" },
  );

  return {
    data,
    isLoading,
    isInitialError,
    error,
  };
};
