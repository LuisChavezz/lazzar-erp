import { useQuery } from "@tanstack/react-query";
import { getPackingOnboarding } from "../services/actions";
import type { PackingOnboardingData } from "../interfaces/packing-onboarding.interface";

/**
 * Onboarding de packing (`GET /wms/packings/onboarding/`).
 *
 * - `usePackingOnboarding()` / `usePackingOnboarding(null)` → solo el catálogo
 *   de pickings candidatos, para el Paso 1.
 * - `usePackingOnboarding(pickingId)` → además el picking elegido y el
 *   pendiente real por empacar de sus líneas, para el Paso 2.
 *
 * DESVIACIÓN DELIBERADA de los defaults de caché del proyecto (staleTime
 * 15min) — pero SOLO para la llamada con `pickingId`: el pendiente por línea
 * puede reducirse entre que se carga el formulario y se envía (otro operador
 * empaca la misma línea desde otra pestaña). Para esa llamada se fuerza
 * `staleTime: 0` + `refetchOnMount: "always"` (cada vez que se entra al Paso 2
 * se recargan pendientes frescos) y un `gcTime` corto. Ante los errores de "ya
 * no tiene pendiente"/"excede lo pendiente" el Paso 2 dispara además un
 * `refetch()` manual (ver `usePackingStep2Form`). Mismo patrón que
 * `usePickingOnboarding`.
 *
 * La llamada SIN `pickingId` (solo el catálogo de pickings del Paso 1) es un
 * catálogo normal —tan estable como cualquier otro del proyecto—, así que usa
 * el `staleTime` global (15min): forzar un refetch cada vez que se monta el
 * Paso 1 (al abrir el diálogo o al "Regresar" desde el Paso 2) no tiene
 * ningún beneficio de frescura y solo agrega una petición.
 */
export const usePackingOnboarding = (pickingId?: number | null) => {
  const normalizedPickingId = pickingId && pickingId > 0 ? pickingId : null;
  const isPickingScoped = normalizedPickingId !== null;

  const query = useQuery<PackingOnboardingData>({
    queryKey: ["packing-onboarding", normalizedPickingId],
    queryFn: () => getPackingOnboarding(normalizedPickingId),
    ...(isPickingScoped
      ? { staleTime: 0, gcTime: 30_000, refetchOnMount: "always" as const }
      : {}),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
};
