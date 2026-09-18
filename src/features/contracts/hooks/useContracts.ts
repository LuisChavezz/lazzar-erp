import { useQuery } from "@tanstack/react-query";
import { getContracts } from "../services/actions";
import { Contract } from "../interfaces/contract.interface";

export const useContracts = () => {
  const {
    data: contracts = [],
    isLoading,
    isError,
    error,
  } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: getContracts,
  });

  return {
    contracts,
    isLoading,
    isError,
    error,
  };
};
