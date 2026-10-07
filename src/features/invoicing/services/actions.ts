import { v1_api } from "@/src/api/v1.api";
import { decimalToCents } from "@/src/features/orders/utils/orderAccounting";
import { Invoice } from "../interfaces/invoice.interface";
import type {
  InvoiceOnboardingData,
  InvoiceOnboardingPayload,
} from "../interfaces/invoice-onboarding.interface";
import { invoiceOnboardingResponseSchema } from "../schemas/invoice-onboarding.schema";

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
 * Piezas por talla del pedido —pedidas, facturadas y pendientes— para armar una
 * factura parcial (`GET /finanzas/facturas/onboarding/?pedido={id}`).
 *
 * Valida la respuesta y normaliza los strings numéricos AQUÍ, no en los
 * componentes: el precio pasa a centavos enteros y la tasa de IVA a número.
 * Una línea es facturable si tiene producto de catálogo y piezas pendientes.
 * El `404` (pedido de otra empresa o inexistente) se deja propagar.
 */
export const getInvoiceOnboarding = async (
  pedidoId: number,
): Promise<InvoiceOnboardingData> => {
  const { data } = await v1_api.get<unknown>("/finanzas/facturas/onboarding/", {
    params: { pedido: pedidoId },
  });
  const parsed = invoiceOnboardingResponseSchema.parse(data);

  return {
    ...parsed,
    porcentaje_impuesto: Number(parsed.porcentaje_impuesto),
    tallas: parsed.tallas.map(({ precio_unitario, ...talla }) => ({
      ...talla,
      precio_unitario_centavos: decimalToCents(precio_unitario) ?? 0,
      facturable: talla.producto !== null && talla.cantidad_pendiente > 0,
    })),
  };
};

/**
 * Crea UNA factura parcial en estatus `Borrador` con las piezas indicadas
 * (`POST /finanzas/facturas/onboarding/`, responde `200` con la factura
 * completa). No genera CxC ni póliza. El error se deja propagar tal cual: los
 * `400` traen el motivo bajo `factura_detalles` o `pedido`.
 */
export const createInvoiceFromOnboarding = async (
  payload: InvoiceOnboardingPayload,
): Promise<Invoice> => {
  const { data } = await v1_api.post<Invoice>(
    "/finanzas/facturas/onboarding/",
    payload,
  );
  return data;
};
