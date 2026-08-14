import { useQuery } from "@tanstack/react-query";
import { getAreas } from "../services/actions";
import { Area } from "../interfaces/area.interface";

export const useAreas = () => {
  const {
    data: areas = [],
    isLoading,
    isError,
    error,
  } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: getAreas,
  });

  return {
    areas,
    isLoading,
    isError,
    error,
  };
};
