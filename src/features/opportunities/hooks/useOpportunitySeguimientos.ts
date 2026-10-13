import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import type { OpportunitySeguimiento } from "../interfaces/seguimiento.interface";
import { getOpportunitySeguimientos } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/**
 * Llave del historial de seguimientos de una oportunidad. Cuelga del prefijo
 * `["opportunities"]`, el que invalidan todas las mutaciones de oportunidades y
 * de seguimientos: el historial se relee con ellas —a la vez que el detalle—
 * sin que ninguna lo nombre.
 */
export const opportunitySeguimientosKey = (opportunityId: number) =>
  [...OPPORTUNITIES_KEY, "seguimientos", opportunityId] as const;

/**
 * TODOS los seguimientos de una oportunidad
 * (`GET /ventas/oportunidad-seguimientos/?oportunidad=<id>`, sin paginar).
 *
 * Consulta propia, y no los `seguimientos` del detalle, porque el detalle solo
 * trae los 50 más recientes sin importar si están completados: un pendiente
 * más viejo no aparecía en la lista, así que no había cómo completarlo. De
 * esta lista sale también el resumen de la sección (pendientes y próximo
 * recordatorio).
 *
 * `refetchOnMount: "always"`, igual que el detalle: los dos se leen frescos al
 * abrir la página, y no uno fresco y el otro de la caché.
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
