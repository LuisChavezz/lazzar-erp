import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";
import { invoiceCurrencyCode, requiresInvoiceTipoCambio } from "./invoiceCurrency";
import { isInvoiceStamped } from "./invoiceStamping";

/**
 * Permiso que exige el backend en `POST /finanzas/facturas/{id}/emitir/` (sin
 * él responde `403`). El backend reutiliza el de cancelar y timbrar
 * (`PERMISO_CANCELAR_FACTURA`), así que es el mismo código. La compuerta real
 * sigue siendo el backend; esta es de UX.
 */
export const INVOICE_EMIT_PERMISSION = "E-FIN-FACTURAS";

/**
 * ¿Se ofrece "Emitir factura"? Solo un `Borrador` ACTIVO: `emitir/` rechaza
 * una eliminada y cualquier otro estatus. `activo` desconocido (`undefined`)
 * cuenta como NO activa: ante la duda no se ofrece una acción irreversible.
 */
export const isInvoiceEmittable = (invoice: {
  activo?: boolean;
  estatus: InvoiceEstatus | string;
}): boolean => invoice.activo === true && invoice.estatus === INVOICE_STATUS.BORRADOR;

/** ¿Se ofrece "Emitir factura" a ESTE usuario para ESTA factura? */
export const canEmitInvoice = (
  invoice: Parameters<typeof isInvoiceEmittable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(INVOICE_EMIT_PERMISSION, user) && isInvoiceEmittable(invoice);

/**
 * ¿La factura ya tiene CFDI y está fuera de MXN? Entonces su tipo de cambio es
 * el del CFDI y no se toca: el backend aún deja cambiarlo en `Borrador`
 * (nucleo-erp#669), pero la póliza saldría con otro tipo de cambio que el CFDI.
 */
export const isInvoiceTipoCambioLockedByCfdi = (invoice: {
  moneda_nombre: string | null;
  cfdi_uuid: string | null;
}): boolean => isInvoiceStamped(invoice) && requiresInvoiceTipoCambio(invoice);

/** Explicación de "Emitir" bloqueado: timbrada fuera de MXN y sin tipo de cambio. */
export const invoiceStampedWithoutTipoCambioMessage = (moneda: string): string =>
  `La factura ya está timbrada y no tiene tipo de cambio: no puede emitirse, porque cualquier tipo de cambio que se capture para ${moneda || "su moneda"} contradiría su CFDI.`;

/**
 * Motivo por el que "Emitir factura" se muestra bloqueado, o `null`. El
 * backend solo emite una factura con total mayor a 0 (la cuenta por cobrar
 * nace con saldo = total); el mensaje es el suyo. Tampoco se emite una
 * timbrada fuera de MXN sin tipo de cambio: no hay uno que no contradiga su
 * CFDI.
 */
export const getInvoiceEmitBlockReason = (invoice: {
  total: string;
  moneda_nombre: string | null;
  tipo_cambio: string | null;
  cfdi_uuid: string | null;
}): string | null => {
  if (!(Number(invoice.total) > 0)) return "La factura debe tener un total mayor a 0 para emitirse.";
  if (isInvoiceTipoCambioLockedByCfdi(invoice) && invoice.tipo_cambio === null) {
    return invoiceStampedWithoutTipoCambioMessage(invoiceCurrencyCode(invoice));
  }
  return null;
};

/**
 * Mensaje de un fallo de `emitir/` o del PATCH previo que no va bajo el campo
 * del tipo de cambio: el primer mensaje del cuerpo DRF (`estatus`, `total`,
 * la configuración contable de la póliza, el `detail` de un 403/404) o el
 * respaldo genérico (red, 5xx).
 */
export const emitInvoiceErrorMessage = (error: unknown): string =>
  firstDrfFieldMessage(error) ?? extractErrorMessage(error, "No se pudo emitir la factura.");
