import { useQuery } from "@tanstack/react-query";
import { getTaxes } from "../services/actions";
import { Tax } from "../interfaces/tax.interface";

export const useTaxes = () => {
  const {
    data: taxes = [],
    isLoading,
    isError,
    error,
  } = useQuery<Tax[]>({
    queryKey: ["taxes"],
    queryFn: getTaxes,
  });

  return {
    taxes,
    isLoading,
    isError,
    error,
  };
};
