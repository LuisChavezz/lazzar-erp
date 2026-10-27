"use client";

import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import type { OpportunityCotizacionesLinks } from "../interfaces/opportunity-onboarding.interface";
import {
  getOpportunityCotizaciones,
  ligarOpportunityCotizaciones,
  quitarOpportunityCotizacion,
} from "../services/actions";
import { OPPORTUNITY_GONE_DETAIL_MESSAGE } from "./opportunityErrorMessages";
import { OPPORTUNITIES_KEY } from "./useOpportunitiesTable";

/**
 * Ligar cotizaciones que ya existen a una oportunidad y quitarlas
 * (`/ventas/oportunidades/{id}/cotizaciones/`).
 *
 * Las mutaciones releen TODO lo de oportunidades al terminar —bien o mal—
 * invalidando el prefijo `["opportunities"]`: ligar o quitar cambia el `estado`
 * calculado (Cotizada/Ganada) en el detalle, el listado y el embudo, y también
 * las `disponibles` de esta misma consulta, que cuelga del prefijo. Releen
 * además las cotizaciones, cuyo campo `oportunidad` cambió. Sin escritura
 * optimista: devuelven la promesa de la relectura, así que siguen "pending"
 * hasta que la pantalla está al día.
 */

/*
 * Errores: `drfActionErrorMessage`. Los rechazos de negocio llegan por campo y
 * como texto plano —`cotizaciones` (alguna no se puede ligar, lista vacía),
 * `etapa` (oportunidad Perdida), `cliente` (sin cliente), `cotizacion` (quitar
 * una autorizada)— y un 404 con `detail`; el helper muestra el primero.
 */

export const opportunityCotizacionesKey = (opportunityId: number) =>
  [...OPPORTUNITIES_KEY, "cotizaciones", opportunityId] as const;

/**
 * `ligadas` y `disponibles` de la oportunidad. La monta el selector de "Ligar
 * cotización" SOLO mientras está abierto, y relee en cada apertura
 * (`refetchOnMount: "always"`): otra persona pudo ligar o crear cotizaciones
 * del cliente desde la última vez.
 */
export const useOpportunityCotizacionesLinks = (opportunityId: number) => {
  const { data, isLoading, isInitialError } = useGuardedQuery<OpportunityCotizacionesLinks>(
    {
      queryKey: opportunityCotizacionesKey(opportunityId),
      queryFn: () => getOpportunityCotizaciones(opportunityId),
      retry: retryUnlessClientError,
      refetchOnMount: "always",
    },
    {
      toastId: "opportunity-cotizaciones-refetch-error",
      errorMessage: "No se pudieron actualizar las cotizaciones disponibles.",
    }
  );

  return { disponibles: data?.disponibles ?? [], isLoading, isInitialError };
};

const invalidateAfterLinkChange = (queryClient: ReturnType<typeof useQueryClient>) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: OPPORTUNITIES_KEY }),
    queryClient.invalidateQueries({ queryKey: ["quotes"] }),
    queryClient.invalidateQueries({ queryKey: ["quote"] }),
  ]);

/**
 * Liga varias cotizaciones de una vez. El POST es todo o nada: con un 400 no
 * se ligó ninguna, y la relectura deja las `disponibles` al día (p. ej. si otra
 * persona ligó alguna entretanto).
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
    },
    onError: (error) => {
      console.error(error);
      toast.error(
        drfActionErrorMessage(
          error,
          "No se pudieron ligar las cotizaciones. Intenta de nuevo.",
          OPPORTUNITY_GONE_DETAIL_MESSAGE
        )
      );
    },
    onSettled: () => invalidateAfterLinkChange(queryClient),
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
    onSettled: () => invalidateAfterLinkChange(queryClient),
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
