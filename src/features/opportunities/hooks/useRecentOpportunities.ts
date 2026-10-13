import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import type { OpportunityListResponse } from "../interfaces/opportunity.interface";
import { getOpportunities } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/** Cuántas oportunidades trae la lista de recientes. */
export const RECENT_OPPORTUNITIES_LIMIT = 5;

/**
 * Las oportunidades más recientes del usuario
 * (`GET /ventas/oportunidades/?limit=5&ordering=-created_at`), en su alcance:
 * un vendedor ve las suyas; un administrador de empresa, las de la empresa.
 *
 * La llave cuelga del prefijo `["opportunities"]`: se relee con cualquier
 * mutación de oportunidades. `refetchOnMount: "always"`, como el embudo, porque
 * el estado cambia desde pantallas que no invalidan esta llave.
 *
 * Contrato de `useGuardedQuery`: `opportunities` es `undefined` hasta la
 * primera respuesta; solo una carga inicial fallida da `isInitialError`.
 */
export const useRecentOpportunities = () => {
  const { data, isInitialError, isFetching, refetch } = useGuardedQuery<OpportunityListResponse>(
    {
      queryKey: [...OPPORTUNITIES_KEY, "recent"],
      queryFn: () =>
        getOpportunities({ limit: RECENT_OPPORTUNITIES_LIMIT, ordering: "-created_at" }),
      refetchOnMount: "always",
    },
    {
      toastId: "opportunities-recent-refetch-error",
      errorMessage: "No se pudieron actualizar las oportunidades recientes.",
    }
  );

  return { opportunities: data?.results, isInitialError, isFetching, refetch };
};
