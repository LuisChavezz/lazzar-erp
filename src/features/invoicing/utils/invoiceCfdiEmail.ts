import { isAxiosError } from "axios";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { INVOICE_STATUS, isInvoiceSendable } from "../constants/invoiceStatus";
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
  | "not-sendable"
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
 * `useSendInvoiceCfdi`, siempre sobre el retrieve. En orden:
 *
 * - `deleted`: eliminada (`activo !== true`; desconocido cuenta como eliminada).
 *   La acción se OCULTA.
 * - `not-sendable`: estatus no enviable (Cancelada, o uno desconocido; la
 *   misma regla que "Enviar correo", `isInvoiceSendable`).
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
  if (!isInvoiceSendable(invoice.estatus)) {
    return {
      reason: "not-sendable",
      message:
        invoice.estatus === INVOICE_STATUS.CANCELADA
          ? "No se puede enviar el CFDI de una factura cancelada."
          : "No se puede enviar el CFDI de una factura en este estatus.",
    };
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

const SEND_INVOICE_CFDI_NOT_SENT_MESSAGE =
  "No se pudo enviar el CFDI por correo. Intenta de nuevo.";

const SEND_INVOICE_CFDI_UNKNOWN_MESSAGE =
  "No se recibió la confirmación del envío: el correo pudo haberse enviado. Confirma con el destinatario antes de reintentar.";

/** Estados de pasarela: el backend pudo terminar el envío después del corte. */
const GATEWAY_STATUSES: readonly number[] = [502, 503, 504];

/**
 * Fallo de `enviar-cfdi/`. `not-sent`: el backend lo rechazó (`400`) o falló
 * al enviar (`500`, p. ej. el SMTP), así que no salió nada. `unknown`: la
 * respuesta no llegó (red, timeout) o la cortó la pasarela (`502`/`503`/`504`),
 * y el correo pudo haber salido: reintentar a ciegas lo duplicaría.
 * `emailError` es el mensaje del backend bajo `email`, para pintarlo bajo el
 * campo.
 */
export interface SendInvoiceCfdiFailure {
  outcome: "not-sent" | "unknown";
  message: string;
  emailError?: string;
}

/**
 * Clasifica un fallo de `enviar-cfdi/`. Con `not-sent` el motivo del backend
 * va tal cual: bajo `cfdi` (sin CFDI, o Facturama no entregó un archivo) o
 * bajo `email` (correo inválido), como string o como lista; después el
 * `detail` de un 403/404 o el `{ error }` genérico; sin ninguno, el texto fijo.
 */
export const describeSendInvoiceCfdiError = (error: unknown): SendInvoiceCfdiFailure => {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === undefined || GATEWAY_STATUSES.includes(status)) {
      return { outcome: "unknown", message: SEND_INVOICE_CFDI_UNKNOWN_MESSAGE };
    }
  }
  const emailError = drfFieldMessage(error, "email");
  return {
    outcome: "not-sent",
    message:
      drfFieldMessage(error, "cfdi") ??
      emailError ??
      firstDrfFieldMessage(error) ??
      extractErrorMessage(error, SEND_INVOICE_CFDI_NOT_SENT_MESSAGE),
    emailError,
  };
};
