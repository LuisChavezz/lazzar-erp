import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getIncidents } from "../services/actions";
import { Incident } from "../interfaces/incident.interface";

/** Llave del catálogo. La comparten la consulta, el optimista y la invalidación. */
export const INCIDENTS_KEY = ["incidents"] as const;

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché (p. ej. la invalidación
 * tras guardar) conserva lo cargado y avisa por toast (`useHasLoadedQuery`).
 * `error` sigue la misma regla. Mismo contrato que `useTrainings`.
 */
export const useIncidents = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Incident[]>({
    queryKey: INCIDENTS_KEY,
    queryFn: getIncidents,
  });

  const incidents = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "incidents-refetch-error",
  });

  return {
    incidents,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
