import { v1_api } from "@/src/api/v1.api";
import { decimalToCents } from "@/src/features/orders/utils/orderAccounting";
import type {
  Invoice,
  InvoiceCancelResponse,
  InvoiceCfdiEmailResponse,
  InvoiceEmitResponse,
  InvoiceListRow,
} from "../interfaces/invoice.interface";
import type {
  InvoiceOnboardingData,
  InvoiceOnboardingPayload,
} from "../interfaces/invoice-onboarding.interface";
import { invoiceOnboardingResponseSchema } from "../schemas/invoice-onboarding.schema";
import type { InvoiceDesglose } from "../interfaces/invoice-desglose.interface";
import { invoiceDesgloseResponseSchema } from "../schemas/invoice-desglose.schema";

export const getInvoices = async (): Promise<InvoiceListRow[]> => {
  const response = await v1_api.get<InvoiceListRow[]>("/finanzas/facturas/");
  return response.data;
};

/**
 * Detalle de UNA factura (`GET /finanzas/facturas/{id}/`).
 *
 * El retrieve usa `FacturaSerializer` completo (`factura_detalles`, `activo`,
 * `correo_facturas`); el listado usa `FacturaListSerializer`, ligero y SIN esos
 * campos (ver `InvoiceListRow`). Por eso el PDF y el correo —en la página de
 * detalle y en el menú del listado— y las notas de crédito, vía
 * `useInvoiceDetail`, piden el retrieve en vez de reutilizar una fila del
 * listado.
 */
export const getInvoiceDetail = async (id: number): Promise<Invoice> => {
  const response = await v1_api.get<Invoice>(`/finanzas/facturas/${id}/`);
  return response.data;
};

/**
 * Factura completa para la página de detalle
 * (`GET /finanzas/facturas/{id}/desglose/`): conceptos por renglón del pedido
 * con sus tallas, avance del pedido, parcialidades, cobranza y notas de
 * crédito. Valida la respuesta y convierte los importes a número AQUÍ. El
 * `404` (otra empresa o inexistente) se deja propagar.
 */
export const getInvoiceDesglose = async (id: number): Promise<InvoiceDesglose> => {
  const { data } = await v1_api.get<unknown>(`/finanzas/facturas/${id}/desglose/`);
  return invoiceDesgloseResponseSchema.parse(data);
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

/**
 * Cancela una factura `Borrador` o `Emitida`
 * (`POST /finanzas/facturas/{id}/cancelar/`, responde `200` con la factura
 * completa y `contrapoliza_id`). `motivo` es opcional y solo se manda si trae
 * texto: el backend lo agrega a `observaciones`. Cancelar una ya cancelada
 * responde `200` sin efecto. El error se deja propagar (p. ej. el `400` bajo
 * `estatus` si tiene notas de crédito emitidas).
 */
export const cancelInvoice = async ({
  id,
  motivo,
}: {
  id: number;
  motivo?: string;
}): Promise<InvoiceCancelResponse> => {
  const { data } = await v1_api.post<InvoiceCancelResponse>(
    `/finanzas/facturas/${id}/cancelar/`,
    motivo ? { motivo } : {},
  );
  return data;
};

/**
 * Edita una factura (`PATCH /finanzas/facturas/{id}/`, responde `200` con la
 * factura completa). Por ahora solo `tipo_cambio`, que el backend acepta
 * mientras la factura es `Borrador` (`> 0`, hasta 6 decimales); no debe
 * mandarse en MXN, donde se guardaría sin efecto. El error se deja propagar:
 * los `400` traen el motivo bajo `tipo_cambio` (inválido, o la factura ya no
 * es `Borrador`) o bajo `estatus` (cancelada).
 */
export const patchInvoice = async ({
  id,
  tipo_cambio,
}: {
  id: number;
  tipo_cambio: string;
}): Promise<Invoice> => {
  const { data } = await v1_api.patch<Invoice>(`/finanzas/facturas/${id}/`, { tipo_cambio });
  return data;
};

/**
 * Emite una factura `Borrador` (`POST /finanzas/facturas/{id}/emitir/`): pasa
 * a `Emitida`, se fecha hoy, toma el vencimiento del crédito del cliente si no
 * traía uno, y crea su cuenta por cobrar y su póliza. No lleva cuerpo. Exige
 * `E-FIN-FACTURAS` (`403` sin él). El error se deja propagar: los `400` traen
 * el motivo bajo `tipo_cambio` (fuera de MXN sin tipo de cambio), `estatus`
 * (eliminada o ya no `Borrador`), `total` (en 0) o las llaves de la
 * configuración contable de la póliza.
 */
export const emitInvoice = async (id: number): Promise<InvoiceEmitResponse> => {
  const { data } = await v1_api.post<InvoiceEmitResponse>(`/finanzas/facturas/${id}/emitir/`);
  return data;
};

/**
 * Timbra el CFDI de la factura ante el SAT vía Facturama
 * (`POST /finanzas/facturas/{id}/timbrar/`). Acto fiscal IRREVERSIBLE. No lleva
 * cuerpo (el backend no lee ninguno) y responde `200` con la factura completa
 * (`FacturaSerializer`), ya con `cfdi_uuid`, `facturama_id` y
 * `cfdi_fecha_timbrado`. No cambia `estatus`, CxC ni póliza. El error se deja
 * propagar: los `400` traen el motivo bajo `cfdi` (ya timbrada, datos
 * fiscales faltantes, rechazo o falla de Facturama) o bajo `estatus` (inactiva
 * o cancelada), como string o como lista.
 */
export const stampInvoice = async (id: number): Promise<Invoice> => {
  const { data } = await v1_api.post<Invoice>(`/finanzas/facturas/${id}/timbrar/`);
  return data;
};

/**
 * Envía por correo el PDF y el XML OFICIALES del CFDI, que el backend descarga
 * de Facturama (`POST /finanzas/facturas/{id}/enviar-cfdi/`). Siempre manda el
 * `email` que el usuario confirmó en el diálogo: sin él, el backend usaría
 * `correo_facturas` por su cuenta. Admite UNA sola dirección. Es síncrono (dos
 * descargas de Facturama más el SMTP) y puede tardar cerca de un minuto; el
 * cliente no tiene timeout que lo corte. Responde `200 { enviado_a }`. El error
 * se deja propagar: los `400` traen el motivo bajo `cfdi` (sin CFDI, o
 * Facturama no entregó un archivo) o bajo `email` (correo inválido); un fallo
 * del SMTP llega como `500` sin cuerpo útil.
 */
export const sendInvoiceCfdi = async ({
  id,
  email,
}: {
  id: number;
  email: string;
}): Promise<InvoiceCfdiEmailResponse> => {
  const { data } = await v1_api.post<InvoiceCfdiEmailResponse>(
    `/finanzas/facturas/${id}/enviar-cfdi/`,
    { email },
  );
  return data;
};
