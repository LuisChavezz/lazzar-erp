import { useQuery } from "@tanstack/react-query";
import { getBranches } from "../services/actions";

export const useBranches = () => {
  const {
    data: branches = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
  });

  return {
    branches,
    isLoading,
    isError,
    error,
  };
};
