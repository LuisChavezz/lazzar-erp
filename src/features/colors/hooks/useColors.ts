import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getColors } from "../services/actions";
import { Color } from "../interfaces/color.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useColors = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: getColors,
  });

  const colors = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "colors-refetch-error",
  });

  return {
    colors,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
