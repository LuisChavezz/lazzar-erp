import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getProductivityRecords } from "../services/actions";
import { Productivity } from "../interfaces/productivity.interface";

/** Llave del listado. La comparten la consulta, el optimista y la invalidación. */
export const PRODUCTIVITY_KEY = ["productivity"] as const;

/**
 * Mismo contrato que `useAbsences`: `isInitialError` solo si NUNCA cargó (un
 * refetch fallido conserva lo cargado y avisa por toast), y `hasLoaded`
 * distingue "sin registros" de "aún no hay datos".
 */
export const useProductivity = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Productivity[]>({
    queryKey: PRODUCTIVITY_KEY,
    queryFn: getProductivityRecords,
  });

  const records = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "productivity-refetch-error",
  });

  return {
    records,
    hasLoaded: data !== undefined,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
