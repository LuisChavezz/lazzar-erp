import { useQuery } from "@tanstack/react-query";
import { getInvoiceOnboarding } from "../services/actions";
import type { InvoiceOnboardingData } from "../interfaces/invoice-onboarding.interface";

export const invoiceOnboardingQueryKey = (pedidoId: number) =>
  ["invoice-onboarding", pedidoId] as const;

/**
 * Piezas por talla de un pedido para facturar (Paso 2 de "Nueva Factura").
 *
 * DESVIACIÓN DELIBERADA de los defaults de caché (staleTime 15 min), mismo
 * criterio que `usePickingOnboarding`: lo pendiente puede bajar entre que se
 * carga el paso y se envía (otra pestaña u otro usuario factura las mismas
 * piezas), así que cada entrada al Paso 2 recarga datos frescos
 * (`staleTime: 0` + `refetchOnMount: "always"`) y la caché se suelta pronto.
 * Ante un `400` de "solicitadas > pendientes" el paso además hace `refetch()`.
 */
export const useInvoiceOnboarding = (pedidoId: number) => {
  const query = useQuery<InvoiceOnboardingData>({
    queryKey: invoiceOnboardingQueryKey(pedidoId),
    queryFn: () => getInvoiceOnboarding(pedidoId),
    enabled: pedidoId > 0,
    staleTime: 0,
    gcTime: 30_000,
    refetchOnMount: "always",
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
