import { useQuery } from "@tanstack/react-query";
import { getCurrencies } from "../services/actions";
import { Currency } from "../interfaces/currency.interface";

export const useCurrencies = () => {
  return useQuery<Currency[]>({
    queryKey: ["currencies"],
    queryFn: getCurrencies,
  });
};
