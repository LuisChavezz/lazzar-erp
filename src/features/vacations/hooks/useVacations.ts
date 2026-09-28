import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getVacations } from "../services/actions";
import { Vacation } from "../interfaces/vacation.interface";

/** Llave del listado. La comparten la consulta, el optimista y la invalidación. */
export const VACATIONS_KEY = ["vacations"] as const;

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). Mismo contrato que `useEvaluations`.
 *
 * `hasLoaded` distingue "sin solicitudes" de "aún no hay datos": la regla de
 * traslape del formulario no puede evaluarse contra un listado que no llegó.
 */
export const useVacations = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Vacation[]>({
    queryKey: VACATIONS_KEY,
    queryFn: getVacations,
  });

  const vacations = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "vacations-refetch-error",
  });

  return {
    vacations,
    hasLoaded: data !== undefined,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
