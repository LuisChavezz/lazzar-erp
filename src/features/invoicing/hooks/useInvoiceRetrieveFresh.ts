import { useQuery } from "@tanstack/react-query";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getInvoiceDetail } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";

/**
 * Retrieve de la factura para su página de detalle, SIEMPRE fresco
 * (`staleTime: 0` + `refetchOnMount: "always"`, como el desglose): de él salen
 * `activo`, la regla de "Enviar correo" y el `Invoice` del PDF y el correo, que
 * no pueden venir de una caché vieja mientras el resto de la página es actual.
 *
 * Misma llave que `useInvoiceDetail` (`["invoice-detail", id]`), así que
 * comparte —y refresca— la caché que usan las notas de crédito. Un 404 no se
 * reintenta.
 */
export const useInvoiceRetrieveFresh = (id: number | null) =>
  useQuery<Invoice>({
    queryKey: ["invoice-detail", id],
    queryFn: () => getInvoiceDetail(id as number),
    enabled: id !== null && id > 0,
    staleTime: 0,
    refetchOnMount: "always",
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });
