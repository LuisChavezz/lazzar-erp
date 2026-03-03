import { useQuery } from "@tanstack/react-query";
import { getSatProdservCodes } from "../services/actions";
import { SatProdservCode } from "../interfaces/sat-prodserv-code.interface";

export const useSatProdServCodes = () => {
  const {
    data: satProdservCodes = [],
    isLoading,
    isError,
    error,
  } = useQuery<SatProdservCode[]>({
    queryKey: ["sat-prodserv-codes"],
    queryFn: getSatProdservCodes,
  });

  return {
    satProdservCodes,
    isLoading,
    isError,
    error,
  };
};
