import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCompanyBranches } from "../services/actions";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * de ESTA empresa nunca cargó; un refetch fallido con datos en caché conserva
 * lo cargado y avisa por toast (`useGuardedQuery`). `error` sigue la misma
 * regla. Mismo contrato que `useProducts`.
 */
export const useCompanyBranches = (companyId: number | null | undefined) => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery(
    {
      queryKey: ["branches", companyId],
      queryFn: () => getCompanyBranches(companyId!),
      enabled: !!companyId,
    },
    { toastId: "branches-refetch-error" },
  );

  const branches = data ?? [];

  return {
    branches,
    isLoading,
    isInitialError,
    error,
  };
};
