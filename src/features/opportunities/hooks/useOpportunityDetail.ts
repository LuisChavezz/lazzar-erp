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

/**
 * Valor en caché de una oportunidad que YA NO ESTÁ (404: dada de baja, de otra
 * empresa o fuera del alcance del usuario). Es una RESPUESTA, no un error: ver
 * `useOpportunityDetail`.
 */
export const OPPORTUNITY_GONE = null;

/**
 * Detalle de una oportunidad (`GET /ventas/oportunidades/{id}/onboarding/`).
 *
 * **El 404 se guarda como dato (`null`), no como error.** `useGuardedQuery`
 * esconde el error de un refetch fallido (conserva lo cargado y avisa por
 * toast), que es lo correcto para un fallo de red pero no para un 404: una
 * oportunidad dada de baja por otra persona seguiría en pantalla, con sus
 * acciones. Como respuesta, el 404 es DEFINITIVO en la carga inicial y en un
 * refetch por igual, no dispara el toast de "no se pudo actualizar" y no se
 * reintenta. `isNotFound` lo expone a la vista.
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
export const useOpportunityDetail = (opportunityId: string) => {
  const numericId = parsePositiveId(opportunityId);
  const isValidId = numericId !== null;

  const { data, hasLoaded, isInitialError, isFetching } = useGuardedQuery<
    OpportunityOnboarding | typeof OPPORTUNITY_GONE
  >(
    {
      queryKey: opportunityDetailKey(numericId ?? 0),
      queryFn: async () => {
        try {
          return await getOpportunityOnboarding(numericId as number);
        } catch (queryError) {
          if (isNotFoundError(queryError)) return OPPORTUNITY_GONE;
          throw queryError;
        }
      },
      enabled: isValidId,
      retry: retryUnlessClientError,
      refetchOnMount: "always",
    },
    {
      toastId: "opportunity-detail-refetch-error",
      errorMessage: "No se pudo actualizar la oportunidad. Mostrando datos anteriores.",
    }
  );

  return {
    /** `undefined` mientras no hay respuesta, o cuando la respuesta fue un 404. */
    data: data ?? undefined,
    isNotFound: data === OPPORTUNITY_GONE,
    isValidId,
    hasLoaded,
    isInitialError,
    isFetching,
  };
};
