import type { AxiosError } from "axios";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { Invoice } from "../interfaces/invoice.interface";
import { isInvoiceCfdiCancelled } from "./invoiceCancellation";
import { isInvoiceStampPending, isInvoiceStamped } from "./invoiceStamping";

/**
 * Permiso para ofrecer "Enviar CFDI": el MISMO que rige "Enviar correo" (el
 * de la sección de Facturación, que exigen la ruta `/finance/invoicing` y el
 * Route Handler de envío). El backend de `enviar-cfdi/` solo pide sesión; esta
 * compuerta es de UX.
 */
export const INVOICE_CFDI_EMAIL_PERMISSION = "R-CONTABILIDAD-FACTURACION";

export type InvoiceCfdiEmailBlockReason =
  | "deleted"
  | "cancelled"
  | "cfdi-cancelled"
  | "stamp-pending"
  | "not-stamped";

export interface InvoiceCfdiEmailBlocker {
  reason: InvoiceCfdiEmailBlockReason;
  message: string;
}

/**
 * Por qué NO se puede enviar el CFDI de una factura, o `null` si se puede.
 * Fuente única para la cabecera del detalle y el precheck de
 * `useSendInvoiceCfdi`, siempre sobre el retrieve (el listado no trae
 * `cfdi_pendiente` ni `cfdi_cancelado`). En orden:
 *
 * - `deleted`: eliminada (`activo !== true`; desconocido cuenta como eliminada).
 *   La acción se OCULTA.
 * - `cancelled`: `estatus` Cancelada.
 * - `cfdi-cancelled`: CFDI cancelado ante el SAT (`cfdi_cancelado`).
 * - `stamp-pending`: timbrado sin confirmar (`cfdi_pendiente`).
 * - `not-stamped`: sin `cfdi_uuid`.
 *
 * Salvo `deleted`, la acción se muestra BLOQUEADA con el motivo. El backend no
 * rechaza ninguno de estos casos (solo exige `facturama_id`): la regla vive aquí.
 */
export function getInvoiceCfdiEmailBlocker(
  invoice: Pick<Invoice, "activo" | "estatus" | "cfdi_uuid" | "cfdi_pendiente" | "cfdi_cancelado">,
): InvoiceCfdiEmailBlocker | null {
  if (invoice.activo !== true) {
    return { reason: "deleted", message: "No se puede enviar el CFDI de una factura eliminada." };
  }
  if (invoice.estatus === INVOICE_STATUS.CANCELADA) {
    return { reason: "cancelled", message: "No se puede enviar el CFDI de una factura cancelada." };
  }
  if (isInvoiceCfdiCancelled(invoice)) {
    return {
      reason: "cfdi-cancelled",
      message: "El CFDI está cancelado ante el SAT: no se puede enviar.",
    };
  }
  if (isInvoiceStampPending(invoice)) {
    return {
      reason: "stamp-pending",
      message: "El timbrado está pendiente de confirmación: aún no hay CFDI que enviar.",
    };
  }
  if (!isInvoiceStamped(invoice)) {
    return {
      reason: "not-stamped",
      message: "La factura no está timbrada: no hay CFDI que enviar.",
    };
  }
  return null;
}

/**
 * Cómo se presenta "Enviar CFDI" a ESTE usuario para ESTA factura: oculta (sin
 * permiso o eliminada), bloqueada con su motivo, o disponible.
 */
export type InvoiceCfdiEmailAvailability =
  | { state: "hidden" }
  | { state: "blocked"; message: string }
  | { state: "available" };

export const getInvoiceCfdiEmailAvailability = (
  invoice: Parameters<typeof getInvoiceCfdiEmailBlocker>[0],
  user: PermissionContext | null | undefined,
): InvoiceCfdiEmailAvailability => {
  if (!hasPermission(INVOICE_CFDI_EMAIL_PERMISSION, user)) return { state: "hidden" };
  const blocker = getInvoiceCfdiEmailBlocker(invoice);
  if (blocker === null) return { state: "available" };
  if (blocker.reason === "deleted") return { state: "hidden" };
  return { state: "blocked", message: blocker.message };
};

const SEND_INVOICE_CFDI_FALLBACK_MESSAGE =
  "No se pudo enviar el CFDI por correo (falla del servidor o de la conexión). Intenta de nuevo.";

/**
 * Mensaje de un fallo de `enviar-cfdi/`. El backend pone el motivo bajo `cfdi`
 * (sin CFDI, o Facturama no entregó un archivo) o bajo `email` (correo
 * inválido), como string o como lista; se muestra tal cual. Después, el
 * `detail` de un 403/404 o el `{ error }` genérico del backend. Sin ninguno (el
 * `500` de un fallo del SMTP llega sin cuerpo útil, o la red) va el texto fijo
 * en español, no el `error.message` de Axios ("Request failed with status
 * code 500") en el que caería `extractErrorMessage`.
 */
export const sendInvoiceCfdiErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "cfdi") ??
  drfFieldMessage(error, "email") ??
  firstDrfFieldMessage(error) ??
  (error as AxiosError<{ error?: string }>)?.response?.data?.error ??
  SEND_INVOICE_CFDI_FALLBACK_MESSAGE;
