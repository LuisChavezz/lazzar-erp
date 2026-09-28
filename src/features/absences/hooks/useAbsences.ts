import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getAbsences } from "../services/actions";
import { Absence } from "../interfaces/absence.interface";

/** Llave del listado. La comparten la consulta, el optimista y la invalidación. */
export const ABSENCES_KEY = ["absences"] as const;

/**
 * Mismo contrato que `useVacations`: `isInitialError` solo si NUNCA cargó (un
 * refetch fallido conserva lo cargado y avisa por toast), y `hasLoaded`
 * distingue "sin registros" de "aún no hay datos".
 */
export const useAbsences = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Absence[]>({
    queryKey: ABSENCES_KEY,
    queryFn: getAbsences,
  });

  const absences = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "absences-refetch-error",
  });

  return {
    absences,
    hasLoaded: data !== undefined,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
