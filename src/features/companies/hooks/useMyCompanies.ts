import { useQuery } from "@tanstack/react-query";
import { getMyCompanies } from "@/src/features/companies/services/actions";

export const useMyCompanies = () => {
  const {
    data: companies = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["my-companies"],
    queryFn: () => getMyCompanies(),
  });

  return {
    companies,
    loading,
    error: isError ? "No se pudieron cargar las empresas." : null,
  };
};
