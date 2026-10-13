import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";
import { getOpportunitySeguimientos } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/**
 * Llave del historial de seguimientos de una oportunidad. Cuelga del prefijo
 * `["opportunities"]`, el que invalidan todas las mutaciones de oportunidades y
 * de seguimientos: el historial se relee con ellas —a la vez que el detalle,
 * del que sale el resumen— sin que ninguna lo nombre.
 */
export const opportunitySeguimientosKey = (opportunityId: number) =>
  [...OPPORTUNITIES_KEY, "seguimientos", opportunityId] as const;

/**
 * TODOS los seguimientos de una oportunidad
 * (`GET /ventas/oportunidad-seguimientos/?oportunidad=<id>`, sin paginar).
 *
 * Consulta propia, y no `onboarding.seguimientos`, porque el detalle solo trae
 * los 50 más recientes sin importar si están completados: un pendiente más
 * viejo contaba en el resumen (`pendientes`, que el backend calcula sobre
 * todos) y no aparecía en la lista, así que no había cómo completarlo.
 *
 * `refetchOnMount: "always"`, igual que el detalle: el resumen y la lista se
 * leen juntos al abrir la página, y no una fresca y la otra de la caché.
 *
 * Contrato de `useGuardedQuery`: `seguimientos` es `undefined` hasta la primera
 * respuesta; un refetch fallido conserva la lista y avisa por toast, y solo una
 * carga inicial fallida da `isInitialError`.
 */
export const useOpportunitySeguimientos = (opportunityId: number) => {
  const { data, isInitialError, isFetching, refetch } = useGuardedQuery<OpportunitySeguimiento[]>(
    {
      queryKey: opportunitySeguimientosKey(opportunityId),
      queryFn: () => getOpportunitySeguimientos(opportunityId),
      refetchOnMount: "always",
    },
    {
      toastId: "opportunity-seguimientos-refetch-error",
      errorMessage: "No se pudieron actualizar los seguimientos. Mostrando los anteriores.",
    }
  );

  return { seguimientos: data, isInitialError, isFetching, refetch };
};
