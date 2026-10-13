import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { parsePositiveId } from "@/src/utils/parsePositiveId";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { OpportunityOnboarding } from "../interfaces/opportunity-onboarding.interface";
import { getOpportunityOnboarding } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/**
 * Llave del detalle. Cuelga del prefijo `["opportunities"]`, el que invalidan
 * alta, edición, baja y "Cotizar": el detalle se refresca con ellas sin que
 * ninguna lo nombre. No choca con el listado, que consulta bajo
 * `["opportunities", "list", params]`.
 */
export const opportunityDetailKey = (id: number) => [...OPPORTUNITIES_KEY, "detail", id] as const;

interface UseOpportunityDetailOptions {
  /**
   * `false` deja de consultar. Lo usa la página cuando ELLA MISMA acaba de dar
   * de baja la oportunidad: su detalle ya se quitó de la caché y volver a
   * pedirlo solo traería un 404.
   */
  enabled?: boolean;
}

/**
 * Detalle de una oportunidad (`GET /ventas/oportunidades/{id}/onboarding/`).
 *
 * **El 404 es un error DEFINITIVO** (`isDefinitiveError` de `useGuardedQuery`):
 * no se reintenta, no avisa por toast y no conserva lo ya cargado, llegue en la
 * carga inicial o en una relectura (la dio de baja otra persona). `isNotFound`
 * lo expone a la vista, y sigue en `true` aunque el siguiente intento falle por
 * otra cosa.
 *
 * `refetchOnMount: "always"`: el `estado` y las cotizaciones cambian desde
 * otras pantallas que no invalidan esta llave (autorizar una cotización en Mesa
 * de Control la pasa a Ganada y le crea pedido); sin esto la página abriría con
 * lo que hubiera en caché durante el `staleTime` global de 15 min.
 *
 * `isValidId` es la ÚNICA validación del id: con uno inválido la consulta queda
 * deshabilitada (y `pending` para siempre), así que la vista lo resuelve antes
 * de mirar la carga.
 */
export const useOpportunityDetail = (
  opportunityId: string,
  { enabled = true }: UseOpportunityDetailOptions = {}
) => {
  const numericId = parsePositiveId(opportunityId);
  const isValidId = numericId !== null;

  const { data, isInitialError, isDefinitiveError } = useGuardedQuery<OpportunityOnboarding>(
    {
      queryKey: opportunityDetailKey(numericId ?? 0),
      queryFn: () => getOpportunityOnboarding(numericId as number),
      enabled: isValidId && enabled,
      retry: retryUnlessClientError,
      refetchOnMount: "always",
    },
    {
      toastId: "opportunity-detail-refetch-error",
      errorMessage: "No se pudo actualizar la oportunidad. Mostrando datos anteriores.",
      isDefinitiveError: isNotFoundError,
    }
  );

  return { data, isNotFound: isDefinitiveError, isValidId, isInitialError };
};
