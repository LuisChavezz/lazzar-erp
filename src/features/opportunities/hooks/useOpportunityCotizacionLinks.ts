"use client";

import { useEffect } from "react";
import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import toast from "react-hot-toast";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { drfActionErrorMessage, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { firstRejectionMessage } from "@/src/utils/firstDrfMessage";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { OpportunityCotizacionesLinks } from "../interfaces/opportunity-onboarding.interface";
import {
  getOpportunityCotizaciones,
  ligarOpportunityCotizaciones,
  quitarOpportunityCotizacion,
} from "../services/actions";
import { OPPORTUNITY_GONE_DETAIL_MESSAGE } from "./opportunityErrorMessages";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";
import { opportunityDetailKey } from "./useOpportunityDetail";

/**
 * Ligar cotizaciones que ya existen a una oportunidad y quitarlas
 * (`/ventas/oportunidades/{id}/cotizaciones/`).
 *
 * Las mutaciones releen TODO lo de oportunidades al terminar —bien o mal—
 * invalidando el prefijo `["opportunities"]`: ligar o quitar cambia el `estado`
 * calculado (Cotizada/Ganada) en el detalle, el listado y el embudo, y también
 * las `disponibles` de esta misma consulta, que cuelga del prefijo. Releen
 * además las cotizaciones, cuyo campo `oportunidad` cambió. Sin escritura
 * optimista: en general devuelven la promesa de la relectura, así que siguen
 * "pending" hasta que la pantalla está al día (ver la excepción de "Ligar").
 */

/*
 * Errores: `drfActionErrorMessage`. Los rechazos de negocio llegan por campo y
 * como texto plano —`cotizaciones` (alguna no se puede ligar, otra persona la
 * cambió entretanto, lista vacía), `etapa` (oportunidad Ganada o Perdida),
 * `vendedor` (sin vendedor), `cliente` (sin cliente), `cotizacion` (quitar una
 * autorizada)— y un 404 con `detail`; el helper muestra el primero.
 */

/**
 * ¿El POST de "Ligar" se rechazó por la OPORTUNIDAD y no por las cotizaciones?
 * 400 con `etapa` (se ganó o se marcó Perdida), `vendedor` (no tiene) o
 * `cliente` (se le quitó): reintentar da el mismo 400, así que el selector se
 * cierra. Con `cotizaciones` sigue abierto.
 */
export const isLigarOportunidadRejection = (error: unknown): boolean =>
  error instanceof AxiosError &&
  error.response?.status === 400 &&
  firstRejectionMessage(error.response.data, ["etapa", "vendedor", "cliente"]) !== undefined;

export const opportunityCotizacionesKey =(opportunityId: number) =>
  [...OPPORTUNITIES_KEY, "cotizaciones", opportunityId] as const;

/**
 * `ligadas` y `disponibles` de la oportunidad. La monta el selector de "Ligar
 * cotización" SOLO mientras está abierto, y relee en cada apertura
 * (`refetchOnMount: "always"`): otra persona pudo ligar o crear cotizaciones
 * del cliente desde la última vez.
 *
 * **El 404 es DEFINITIVO**, como en el detalle (`useOpportunityDetail`): la
 * oportunidad ya no existe o dejó de ser visible. No se reintenta ni avisa por
 * toast, se expone como `isNotFound` y se relee el detalle de detrás, que pasa
 * así a su "no disponible" sin esperar a su propia relectura.
 */
export const useOpportunityCotizacionesLinks = (opportunityId: number) => {
  const queryClient = useQueryClient();
  const { data, isLoading, isInitialError, isDefinitiveError } =
    useGuardedQuery<OpportunityCotizacionesLinks>(
      {
        queryKey: opportunityCotizacionesKey(opportunityId),
        queryFn: () => getOpportunityCotizaciones(opportunityId),
        retry: retryUnlessClientError,
        refetchOnMount: "always",
      },
      {
        toastId: "opportunity-cotizaciones-refetch-error",
        errorMessage: "No se pudieron actualizar las cotizaciones disponibles.",
        isDefinitiveError: isNotFoundError,
      }
    );

  useEffect(() => {
    if (isDefinitiveError) {
      void queryClient.invalidateQueries({ queryKey: opportunityDetailKey(opportunityId) });
    }
  }, [isDefinitiveError, opportunityId, queryClient]);

  return {
    disponibles: data?.disponibles ?? [],
    isLoading,
    isInitialError,
    isNotFound: isDefinitiveError,
  };
};

/**
 * `cotizacionIds`: las cotizaciones cuyo `oportunidad` cambió. Su detalle se
 * relee por id (`["quote", id]` cubre los dos orígenes de `useQuote`), no todos
 * los detalles que haya en caché.
 */
const invalidateAfterLinkChange = (
  queryClient: ReturnType<typeof useQueryClient>,
  cotizacionIds: number[]
) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
    queryClient.invalidateQueries({ queryKey: ["quotes"] }),
    ...cotizacionIds.map((id) => queryClient.invalidateQueries({ queryKey: ["quote", id] })),
  ]);

/**
 * Liga varias cotizaciones de una vez. El POST es todo o nada: con un 400 no
 * se ligó ninguna, y la relectura deja las `disponibles` al día (p. ej. si otra
 * persona ligó alguna entretanto).
 *
 * Con ÉXITO la relectura NO se espera: el selector se cierra en cuanto el
 * backend responde. Si se esperara, las `disponibles` releídas —ya sin las
 * recién ligadas— se pintarían dentro del selector aún abierto (hasta el
 * "no hay cotizaciones" si se ligaron todas), como si hubiera fallado. Con
 * ERROR sí se espera: el selector sigue abierto y debe mostrar la lista fresca.
 */
export const ligarCotizacionesMutationKey = (opportunityId: number) =>
  ["ligar-opportunity-cotizaciones", opportunityId] as const;

export const useLigarOpportunityCotizaciones = (opportunityId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ligarCotizacionesMutationKey(opportunityId),
    mutationFn: (cotizaciones: number[]) => ligarOpportunityCotizaciones(opportunityId, cotizaciones),
    onSuccess: (_data, cotizaciones) => {
      toast.success(
        cotizaciones.length === 1
          ? "Cotización ligada a la oportunidad"
          : `${cotizaciones.length} cotizaciones ligadas a la oportunidad`
      );
      void invalidateAfterLinkChange(queryClient, cotizaciones);
    },
    onError: (error, cotizaciones) => {
      console.error(error);
      toast.error(
        drfActionErrorMessage(
          error,
          "No se pudieron ligar las cotizaciones. Intenta de nuevo.",
          OPPORTUNITY_GONE_DETAIL_MESSAGE
        )
      );
      return invalidateAfterLinkChange(queryClient, cotizaciones);
    },
  });
};

const QUITAR_COTIZACION_MUTATION_KEY = ["quitar-opportunity-cotizacion"] as const;

/** Quita una cotización de la oportunidad; la cotización no se borra. */
export const useQuitarOpportunityCotizacion = (opportunityId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: [...QUITAR_COTIZACION_MUTATION_KEY, opportunityId],
    mutationFn: (cotizacionId: number) => quitarOpportunityCotizacion(opportunityId, cotizacionId),
    onSuccess: () => {
      toast.success("Cotización quitada de la oportunidad");
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        drfActionErrorMessage(
          error,
          "No se pudo quitar la cotización. Intenta de nuevo.",
          // El 404 no distingue: la cotización ya no está ligada (o dejó de ser
          // visible) o la oportunidad ya no existe. La relectura lo resuelve.
          "La cotización ya no está ligada a esta oportunidad o no tienes acceso a ella."
        )
      );
    },
    onSettled: (_data, _error, cotizacionId) =>
      invalidateAfterLinkChange(queryClient, [cotizacionId]),
  });
};

/**
 * Ids de las cotizaciones de ESTA oportunidad con un "Quitar" en curso, para
 * bloquear su renglón. Sale de la caché de mutaciones —no de un `isPending`—
 * para que cada renglón se bloquee por separado y hasta que la relectura llegó.
 */
export const usePendingQuitarCotizacionIds = (opportunityId: number): number[] =>
  useMutationState({
    filters: { mutationKey: [...QUITAR_COTIZACION_MUTATION_KEY, opportunityId], status: "pending" },
    select: (mutation) => mutation.state.variables as number,
  });
