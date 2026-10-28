import { queryOptions, useQuery } from "@tanstack/react-query";
import { getCurrencies } from "../services/actions";
import { Currency } from "../interfaces/currency.interface";

/** Catálogo de monedas; compartido con quien lo espera fuera de un componente (`ensureQueryData`). */
export const currenciesQueryOptions = () =>
  queryOptions<Currency[]>({
    queryKey: ["currencies"],
    queryFn: getCurrencies,
  });

export const useCurrencies = () => {
  return useQuery(currenciesQueryOptions());
};
