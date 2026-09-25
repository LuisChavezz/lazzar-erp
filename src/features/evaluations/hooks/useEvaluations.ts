import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getEvaluations } from "../services/actions";
import { Evaluation } from "../interfaces/evaluation.interface";

/** Llave del catálogo. La comparten la consulta, el optimista y la invalidación. */
export const EVALUATIONS_KEY = ["evaluations"] as const;

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché (p. ej. la invalidación
 * tras guardar) conserva lo cargado y avisa por toast (`useHasLoadedQuery`).
 * `error` sigue la misma regla. Mismo contrato que `useIncidents`.
 */
export const useEvaluations = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Evaluation[]>({
    queryKey: EVALUATIONS_KEY,
    queryFn: getEvaluations,
  });

  const evaluations = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "evaluations-refetch-error",
  });

  return {
    evaluations,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
