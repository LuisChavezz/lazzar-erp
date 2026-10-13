import { keepPreviousData } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { OpportunityEmbudo } from "../interfaces/opportunity-embudo.interface";
import { getOpportunitiesEmbudo } from "../services/actions";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/** Filtros del embudo: los del listado (`cliente`, `vendedor`, `q`), ya validados. */
export type OpportunityEmbudoParams = Record<string, string>;

const NO_PARAMS: OpportunityEmbudoParams = {};

/**
 * Embudo de oportunidades (`GET /ventas/oportunidades/embudo/`): cantidad y
 * monto por estado, en el alcance del usuario (un vendedor, las suyas; un
 * administrador de empresa, las de toda la empresa).
 *
 * - La llave cuelga del prefijo `["opportunities"]`, el que invalidan todas las
 *   mutaciones de oportunidades: el embudo se relee con ellas sin que ninguna
 *   lo nombre.
 * - `refetchOnMount: "always"`: el estado cambia desde pantallas que no
 *   invalidan esta llave (autorizar una cotización la pasa a Ganada).
 * - Con filtros nuevos se conservan las cifras anteriores mientras llegan las
 *   nuevas (`isPlaceholderData`), para que las barras no parpadeen.
 *
 * Contrato de `useGuardedQuery`: `embudo` es `undefined` hasta la primera
 * respuesta; un refetch fallido conserva las cifras y avisa por toast, y solo
 * una carga inicial fallida da `isInitialError`.
 */
export const useOpportunitiesEmbudo = (params: OpportunityEmbudoParams = NO_PARAMS) => {
  const { data, isInitialError, isFetching, isPlaceholderData, refetch } =
    useGuardedQuery<OpportunityEmbudo>(
      {
        queryKey: [...OPPORTUNITIES_KEY, "embudo", params],
        queryFn: () => getOpportunitiesEmbudo(params),
        retry: retryUnlessClientError,
        refetchOnMount: "always",
        placeholderData: keepPreviousData,
      },
      {
        toastId: "opportunities-embudo-refetch-error",
        errorMessage: "No se pudo actualizar el embudo. Mostrando las cifras anteriores.",
      }
    );

  return { embudo: data, isInitialError, isFetching, isPlaceholderData, refetch };
};
