import { useQuery } from "@tanstack/react-query";
import { getSuppliers } from "../services/actions";

export const useSuppliers = () => {
  const {
    data: suppliers = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliers,
  });

  return {
    suppliers,
    isLoading,
    isError,
    error,
  };
};
