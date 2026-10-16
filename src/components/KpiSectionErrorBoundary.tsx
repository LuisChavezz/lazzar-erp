"use client";

import type { ReactNode } from "react";
import { useIsFetching, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { SectionErrorBoundary } from "@/src/components/SectionErrorBoundary";
import { SectionErrorNotice } from "@/src/components/SectionErrorNotice";

/**
 * Aviso del límite de error. "Reintentar" vuelve a PEDIR los indicadores antes
 * de remontar: remontar con el mismo payload lanzaría igual.
 */
function KpiSectionRenderError({
  queryKey,
  message,
  reset,
}: {
  queryKey: QueryKey;
  message: string;
  reset: () => void;
}) {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey }) > 0;
  const retry = async () => {
    await queryClient.refetchQueries({ queryKey });
    reset();
  };
  return (
    <SectionErrorNotice
      title="No se pudieron mostrar los indicadores"
      message={message}
      onRetry={() => void retry()}
      isRetrying={isFetching}
    />
  );
}

/**
 * Límite de error de una sección de indicadores (`SectionErrorBoundary`): si su
 * render lanza (p. ej. el payload cambió de forma), pinta un aviso en lugar de
 * la sección y el resto de la página sigue usable. "Reintentar" refetchea
 * `queryKey` y vuelve a montar. `message` dice qué sigue disponible ("Ocurrió
 * un error al mostrarlos. La lista de clientes sigue disponible.").
 */
export function KpiSectionErrorBoundary({
  queryKey,
  message,
  children,
}: {
  queryKey: QueryKey;
  message: string;
  children: ReactNode;
}) {
  return (
    <SectionErrorBoundary
      fallback={(reset) => <KpiSectionRenderError queryKey={queryKey} message={message} reset={reset} />}
    >
      {children}
    </SectionErrorBoundary>
  );
}
