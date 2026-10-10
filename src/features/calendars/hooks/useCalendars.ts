import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getCalendars } from "../services/actions";
import { Calendar } from "../interfaces/calendar.interface";

/**
 * No expone el `isError` crudo: `isInitialError` solo es `true` si la consulta
 * NUNCA cargó; un refetch fallido con datos en caché conserva lo cargado y
 * avisa por toast (`useGuardedQuery`). `error` sigue la misma regla. Mismo
 * contrato que `useProducts`.
 */
export const useCalendars = () => {
  const { data, isLoading, isInitialError, error } = useGuardedQuery<Calendar[]>(
    {
      queryKey: ["calendars"],
      queryFn: getCalendars,
    },
    { toastId: "calendars-refetch-error" },
  );

  const calendars = data ?? [];

  return {
    calendars,
    isLoading,
    isInitialError,
    error,
  };
};
