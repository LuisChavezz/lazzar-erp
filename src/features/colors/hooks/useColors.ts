import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getColors } from "../services/actions";
import { Color } from "../interfaces/color.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useColors = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Color[]>(
    {
      queryKey: ["colors"],
      queryFn: getColors,
    },
    { toastId: "colors-refetch-error" },
  );

  const colors = data ?? [];

  return {
    colors,
    isLoading,
    isInitialError,
    error,
  };
};
