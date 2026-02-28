import { useQuery } from "@tanstack/react-query";
import { getColors } from "../services/actions";
import { Color } from "../interfaces/color.interface";

export const useColors = () => {
  const {
    data: colors = [],
    isLoading,
    isError,
    error,
  } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: getColors,
  });

  return {
    colors,
    isLoading,
    isError,
    error,
  };
};
