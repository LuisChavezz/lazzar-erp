import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getTaxes } from "../services/actions";
import { Tax } from "../interfaces/tax.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useTaxes = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Tax[]>(
    {
      queryKey: ["taxes"],
      queryFn: getTaxes,
    },
    { toastId: "taxes-refetch-error" },
  );

  const taxes = data ?? [];

  return {
    taxes,
    isLoading,
    isInitialError,
    error,
  };
};
