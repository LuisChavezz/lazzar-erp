import { useQuery } from "@tanstack/react-query";
import { getShifts } from "../services/actions";
import { Shift } from "../interfaces/shift.interface";

export const useShifts = () => {
  const {
    data: shifts = [],
    isLoading,
    isError,
    error,
  } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: getShifts,
  });

  return {
    shifts,
    isLoading,
    isError,
    error,
  };
};
