import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";

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
 * Motivo por el que "Emitir factura" se muestra bloqueado, o `null`. El
 * backend solo emite una factura con total mayor a 0 (la cuenta por cobrar
 * nace con saldo = total); el mensaje es el suyo.
 */
export const getInvoiceEmitBlockReason = (invoice: { total: string }): string | null =>
  Number(invoice.total) > 0 ? null : "La factura debe tener un total mayor a 0 para emitirse.";

/**
 * Mensaje de un fallo de `emitir/` o del PATCH previo que no va bajo el campo
 * del tipo de cambio: el primer mensaje del cuerpo DRF (`estatus`, `total`,
 * la configuración contable de la póliza, el `detail` de un 403/404) o el
 * respaldo genérico (red, 5xx).
 */
export const emitInvoiceErrorMessage = (error: unknown): string =>
  firstDrfFieldMessage(error) ?? extractErrorMessage(error, "No se pudo emitir la factura.");
