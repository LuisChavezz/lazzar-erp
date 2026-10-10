import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getShifts } from "../services/actions";
import { Shift } from "../interfaces/shift.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useHasLoadedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useEmployees`.
 */
export const useShifts = () => {
  const { data, isLoading, isError, error, errorUpdatedAt } = useQuery<Shift[]>({
    queryKey: ["shifts"],
    queryFn: getShifts,
  });

  const shifts = data ?? [];

  const { isInitialError } = useHasLoadedQuery({
    data,
    isError,
    errorUpdatedAt,
    toastId: "shifts-refetch-error",
  });

  return {
    shifts,
    isLoading,
    isInitialError,
    error: isInitialError ? error : null,
  };
};
