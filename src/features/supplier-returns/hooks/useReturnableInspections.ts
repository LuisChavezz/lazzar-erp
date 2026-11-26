import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getReturnableQualityInspections } from "@/src/features/quality-inspections/services/actions";

/**
 * Inspecciones con algo por devolver (`?devolucion_pendiente=true`): el
 * selector del alta desde la pantalla de devoluciones. Cuelga de
 * `["quality-inspections"]`, así que lo releen el alta y la reversa de calidad
 * y el alta o cancelación de una devolución. `enabled` = el diálogo está
 * abierto sin una inspección ya elegida.
 */
export const useReturnableInspections = (enabled: boolean) => {
  const { data, isLoading, isInitialError, error, refetch } = useGuardedQuery(
    {
      queryKey: ["quality-inspections", "devolucion-pendiente"],
      queryFn: getReturnableQualityInspections,
      enabled,
      refetchOnMount: "always",
    },
    { toastId: "returnable-inspections-refetch-error" },
  );
  return { inspections: data ?? [], isLoading, isInitialError, error, refetch };
};
