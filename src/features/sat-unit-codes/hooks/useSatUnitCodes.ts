import { useQuery } from "@tanstack/react-query";
import { getSatUnitCodes } from "../services/actions";
import { SatUnitCode } from "../interfaces/sat-unit-code.interface";

export const useSatUnitCodes = () => {
  const {
    data: satUnitCodes = [],
    isLoading,
    isError,
    error,
  } = useQuery<SatUnitCode[]>({
    queryKey: ["sat-unit-codes"],
    queryFn: getSatUnitCodes,
  });

  return {
    satUnitCodes,
    isLoading,
    isError,
    error,
  };
};
