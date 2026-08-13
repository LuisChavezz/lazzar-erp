import { v1_api } from "@/src/api/v1.api";
import {
  Invoice,
  CreateInvoiceFromOrderBody,
} from "../interfaces/invoice.interface";

export const getInvoices = async (): Promise<Invoice[]> => {
  const response = await v1_api.get<Invoice[]>("/finanzas/facturas/");
  return response.data;
};

/**
 * Detalle de UNA factura (`GET /finanzas/facturas/{id}/`).
 *
 * `retrieve` devuelve el mismo `FacturaSerializer` que el listado (verificado en
 * `finanzas/api/views.py`: `FacturaViewSet` es un `ModelViewSet` con
 * `serializer_class` único y GET habilitado), pero con `factura_detalles`
 * hidratados — que el LISTADO puede no traer (ver la nota de `InvoiceDetails`).
 * Por eso los consumidores que solo tienen el id —la sección "Documentos
 * relacionados" del detalle de pedido, vía `useInvoiceDetail`— deben pedir el
 * detalle en vez de reutilizar una fila del listado.
 */
export const getInvoiceDetail = async (id: number): Promise<Invoice> => {
  const response = await v1_api.get<Invoice>(`/finanzas/facturas/${id}/`);
  return response.data;
};

/**
 * Crea una factura a partir de un pedido. El servidor resuelve todo el detalle
 * desde el pedido y devuelve la `Factura` con la misma forma que el resto del
 * módulo. El error se deja propagar tal cual para que el hook distinga entre el
 * `400` (pedido ya facturado) y el `404` (pedido inexistente).
 */
export const createInvoiceFromOrder = async (
  body: CreateInvoiceFromOrderBody,
): Promise<Invoice> => {
  const { data } = await v1_api.post<Invoice>(
    "/finanzas/facturas/desde-pedido/",
    body,
  );
  return data;
};
