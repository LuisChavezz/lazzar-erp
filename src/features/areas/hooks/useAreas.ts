import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getAreas } from "../services/actions";
import { Area } from "../interfaces/area.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useAreas = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Area[]>(
    {
      queryKey: ["areas"],
      queryFn: getAreas,
    },
    { toastId: "areas-refetch-error" },
  );

  const areas = data ?? [];

  return {
    areas,
    isLoading,
    isInitialError,
    error,
  };
};
