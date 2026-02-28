import { useQuery } from "@tanstack/react-query";
import { getSizes } from "../services/actions";
import { Size } from "../interfaces/size.interface";

export const useSizes = () => {
  const {
    data: sizes = [],
    isLoading,
    isError,
    error,
  } = useQuery<Size[]>({
    queryKey: ["sizes"],
    queryFn: getSizes,
  });

  return {
    sizes,
    isLoading,
    isError,
    error,
  };
};
