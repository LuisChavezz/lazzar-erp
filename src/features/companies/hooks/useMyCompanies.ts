import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getMyCompanies } from "@/src/features/companies/services/actions";

/**
 * No expone el `isError` crudo: `error` solo trae el mensaje si la consulta
 * NUNCA cargó (`isInitialError`); un refetch fallido con datos en caché
 * conserva las empresas y avisa por toast (`useGuardedQuery`).
 */
export const useMyCompanies = () => {
  const { data, isLoading: loading, isInitialError } = useGuardedQuery(
    {
      queryKey: ["my-companies"],
      queryFn: () => getMyCompanies(),
    },
    { toastId: "my-companies-refetch-error" },
  );

  const companies = data ?? [];

  return {
    companies,
    loading,
    error: isInitialError ? "No se pudieron cargar las empresas." : null,
  };
};
