import { useQuery } from "@tanstack/react-query";
import { getPositions } from "../services/actions";
import { Position } from "../interfaces/position.interface";

export const usePositions = () => {
  const {
    data: positions = [],
    isLoading,
    isError,
    error,
  } = useQuery<Position[]>({
    queryKey: ["positions"],
    queryFn: getPositions,
  });

  return {
    positions,
    isLoading,
    isError,
    error,
  };
};
