import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getShifts } from "../services/actions";
import { Shift } from "../interfaces/shift.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useEmployees`.
 */
export const useShifts = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Shift[]>(
    {
      queryKey: ["shifts"],
      queryFn: getShifts,
    },
    { toastId: "shifts-refetch-error" },
  );

  const shifts = data ?? [];

  return {
    shifts,
    isLoading,
    isInitialError,
    error,
  };
};
