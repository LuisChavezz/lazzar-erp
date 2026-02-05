import { useQuery } from "@tanstack/react-query";
import { getCompanyBranches } from "../services/actions";

export const useBranches = (companyId: number | null | undefined) => {
  const {
    data: branches = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: () => getCompanyBranches(companyId!),
    enabled: !!companyId,
  });

  return {
    branches,
    isLoading,
    isError,
    error,
  };
};
