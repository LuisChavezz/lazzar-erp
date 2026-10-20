import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";

/**
 * Permiso que habilita "Cancelar factura". PROVISIONAL: el backend no exige
 * ningún permiso de módulo en `cancelar` (solo `IsAuthenticated`) y aún no
 * existe uno propio de cancelación, así que se reutiliza el de crear facturas.
 * Es una compuerta de UX, no de seguridad.
 */
export const INVOICE_CANCEL_PERMISSION = "C-CONTABILIDAD-FACTURACION";

/** Estatus desde los que el backend permite cancelar (conjunto explícito). */
const CANCELLABLE_STATUSES: readonly string[] = [INVOICE_STATUS.BORRADOR, INVOICE_STATUS.EMITIDA];

/**
 * ¿Se ofrece "Cancelar factura" para esta factura? Solo si está ACTIVA y en un
 * estatus cancelable. `activo` desconocido (`undefined`) cuenta como NO activa:
 * ante la duda no se ofrece una acción irreversible.
 */
export const isInvoiceCancellable = (invoice: {
  activo?: boolean;
  estatus: InvoiceEstatus | string;
}): boolean => invoice.activo === true && CANCELLABLE_STATUSES.includes(invoice.estatus);

/**
 * ¿Se ofrece "Cancelar factura" a ESTE usuario para ESTA factura? Fuente ÚNICA
 * de la regla para el menú del listado y la cabecera del detalle: permiso
 * (`INVOICE_CANCEL_PERMISSION`) + `isInvoiceCancellable`.
 */
export const canCancelInvoice = (
  invoice: Parameters<typeof isInvoiceCancellable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(INVOICE_CANCEL_PERMISSION, user) && isInvoiceCancellable(invoice);

/**
 * Explicación de "Cancelar factura" deshabilitado para una factura timbrada:
 * `cancelar/` solo cancela en el ERP, NO cancela el CFDI ante el SAT, así que
 * dejaría el comprobante fiscal vigente.
 */
export const INVOICE_CANCEL_BLOCKED_BY_CFDI_MESSAGE =
  "Por ahora no se puede cancelar desde el ERP una factura timbrada.";

/**
 * ¿"Cancelar factura" está BLOQUEADO por el CFDI? Toda factura con
 * `cfdi_uuid`. No decide si se ofrece (eso es `canCancelInvoice`): donde se
 * ofrece, se muestra deshabilitado con `INVOICE_CANCEL_BLOCKED_BY_CFDI_MESSAGE`.
 */
export const isInvoiceCancelBlockedByCfdi = (invoice: { cfdi_uuid?: string | null }): boolean =>
  Boolean(invoice.cfdi_uuid);
