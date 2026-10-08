import { queryOptions, useQuery } from "@tanstack/react-query";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { getInvoiceDetail } from "../services/actions";

/**
 * Configuración ÚNICA del retrieve fresco de una factura, compartida por la
 * página de detalle (`useInvoiceRetrieveFresh`) y por el menú del listado
 * (`queryClient.fetchQuery` al activar PDF o correo): de él salen `activo`, la
 * regla de "Enviar correo" y el `Invoice` del PDF y el correo, que no pueden
 * venir de una caché vieja.
 *
 * Misma llave que `useInvoiceDetail` (`["invoice-detail", id]`), así que
 * comparte —y refresca— la caché que usan las notas de crédito. `staleTime: 0`
 * obliga a pedirlo aunque haya copia en caché. Un 404 no se reintenta.
 */
export const invoiceRetrieveFreshOptions = (id: number) =>
  queryOptions({
    queryKey: ["invoice-detail", id],
    queryFn: () => getInvoiceDetail(id),
    staleTime: 0,
    retry: (failureCount, error) => !isNotFoundError(error) && failureCount < 1,
  });

/**
 * Retrieve de la factura para su página de detalle, SIEMPRE fresco (ver
 * `invoiceRetrieveFreshOptions`; además `refetchOnMount: "always"`, como el
 * desglose).
 */
export const useInvoiceRetrieveFresh = (id: number | null) =>
  useQuery({
    ...invoiceRetrieveFreshOptions(id ?? 0),
    enabled: id !== null && id > 0,
    refetchOnMount: "always",
  });
