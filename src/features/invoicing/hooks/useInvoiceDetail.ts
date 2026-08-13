import { useQuery } from "@tanstack/react-query";
import { getInvoiceDetail } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";

/**
 * Detalle de una factura (`GET /finanzas/facturas/{id}/`). Llave
 * `["invoice-detail", id]`.
 *
 * Mismo patrón que `usePackingDetail`/`useCorteMangaOrderDetail`: id nullable y
 * `enabled` que mantiene la consulta APAGADA sin un id válido. Trae el detalle
 * con `factura_detalles` hidratados, que el listado (`useInvoices`) puede no
 * incluir, así que los consumidores que solo tienen el id —como la sección
 * "Documentos relacionados" del detalle de pedido— usan este hook en vez de una
 * fila del listado.
 */
export const useInvoiceDetail = (id: number | null) => {
  return useQuery<Invoice>({
    queryKey: ["invoice-detail", id],
    queryFn: () => getInvoiceDetail(id as number),
    enabled: id !== null && id > 0,
  });
};
