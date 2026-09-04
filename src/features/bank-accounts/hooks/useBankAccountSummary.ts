import { useQuery } from "@tanstack/react-query";
import { getBankAccountSummary } from "../services/actions";
import { ResumenCuentaBancaria } from "../interfaces/bank-account.interface";

/**
 * Resumen de UNA cuenta bancaria, con clave propia por id.
 *
 * `id` acepta `null` como centinela de "ningún resumen abierto" y la consulta
 * queda deshabilitada en ese caso: el resumen es un endpoint aparte del listado
 * y no debe dispararse mientras el diálogo esté cerrado. Mismo criterio que
 * `useCorteMangaOrderDetail`.
 */
export const useBankAccountSummary = (id: number | null) => {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<ResumenCuentaBancaria>({
      queryKey: ["bank-account-summary", id],
      queryFn: () => getBankAccountSummary(id as number),
      enabled: id !== null && id > 0,
    });

  return {
    summary: data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  };
};
