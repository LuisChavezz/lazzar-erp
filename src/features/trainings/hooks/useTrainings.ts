import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getTrainings } from "../services/actions";
import { Training } from "../interfaces/training.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché (p. ej. la invalidación
 * tras guardar) conserva lo cargado y avisa por toast (`useHasLoadedQuery`).
 * `error` sigue la misma regla. Mismo contrato que `useColors`.
 */
export const useTrainings = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Training[]>({
    queryKey: ["trainings"],
    queryFn: getTrainings,
  });

  const trainings = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "trainings-refetch-error",
  });

  return {
    trainings,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
