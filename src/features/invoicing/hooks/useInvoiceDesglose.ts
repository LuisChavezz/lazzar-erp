import { useQuery } from "@tanstack/react-query";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getInvoiceDesglose } from "../services/actions";
import type { InvoiceDesglose } from "../interfaces/invoice-desglose.interface";

export const invoiceDesgloseQueryKey = (id: number) => ["invoice-desglose", id] as const;

/**
 * Desglose de una factura para su página de detalle.
 *
 * DESVIACIÓN DELIBERADA de los defaults de caché (staleTime 15 min): el
 * desglose incluye datos de OTRAS facturas del pedido (avance, parcialidades) y
 * de la cobranza, que cambian sin tocar esta factura. Cada entrada a la página
 * trae datos frescos (`staleTime: 0` + `refetchOnMount: "always"`), mismo
 * criterio que `useInvoiceOnboarding`. Un 404 no se reintenta: no va a
 * aparecer.
 */
export const useInvoiceDesglose = (id: number) =>
  useQuery<InvoiceDesglose>({
    queryKey: invoiceDesgloseQueryKey(id),
    queryFn: () => getInvoiceDesglose(id),
    enabled: id > 0,
    staleTime: 0,
    gcTime: 60_000,
    refetchOnMount: "always",
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });
