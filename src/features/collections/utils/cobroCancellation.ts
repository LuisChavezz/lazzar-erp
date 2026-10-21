import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { COBRO_CANCEL_PERMISSION } from "../constants/collectionPermissions";
import type { Cobro, CobroEstatus } from "../interfaces/collection.interface";
import { isActionOutcomeUnknown } from "./actionOutcome";

/** Estatus desde los que se ofrece "Cancelar cobro". */
const CANCELLABLE_STATUSES: readonly CobroEstatus[] = ["Aplicado", "Borrador"];

export const COBRO_CANCEL_BLOCKED_BY_STATUS_MESSAGE = "Este cobro ya no se puede cancelar.";

export const COBRO_CANCEL_BLOCKED_BY_REP_MESSAGE =
  "El cobro tiene un REP timbrado: primero hay que cancelar el REP ante el SAT.";

export const COBRO_CANCEL_BLOCKED_BY_PENDING_REP_MESSAGE =
  "El timbrado del REP de este cobro no está confirmado con Facturama: contacta a soporte antes de cancelarlo.";

export const COBRO_CANCEL_BLOCKED_BY_UNAVAILABLE_CXC_MESSAGE =
  "No se pudieron consultar las cuentas por cobrar del cobro: no se puede confirmar que se pueda cancelar.";

export const COBRO_CANCEL_BLOCKED_BY_CANCELLED_INVOICE_MESSAGE =
  "Una de las facturas del cobro está cancelada: el cobro no se puede cancelar.";

/**
 * ¿Se ofrece "Cancelar cobro" a ESTE usuario para ESTE cobro? Permiso del
 * backend y un estatus cancelable. Que esté BLOQUEADO (REP, factura cancelada)
 * lo dice `getCobroCancelBlockReason`: el botón se muestra deshabilitado.
 */
export const canOfferCobroCancel = (
  cobro: Pick<Cobro, "estatus">,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(COBRO_CANCEL_PERMISSION, user) && CANCELLABLE_STATUSES.includes(cobro.estatus);

/**
 * Motivo por el que NO se puede cancelar el cobro, o `null` si se puede. En este
 * orden:
 *
 * 1. Estatus no cancelable (solo `Aplicado` y `Borrador`).
 * 2. `rep_uuid`: el REP quedaría vigente ante el SAT.
 * 3. `rep_pendiente`: un timbrado sin confirmar pudo dejar un REP vigente.
 * 4. Sin datos de CxC (`cxcIndex` en `null`) o una línea cuya CxC no aparece:
 *    no se puede saber si su factura está cancelada, así que se bloquea.
 * 5. Una línea con su CxC `Cancelada` (la factura se canceló).
 *
 * El backend solo rechaza 2 y 3; 4 y 5 son decisión de la UI.
 */
export const getCobroCancelBlockReason = (
  cobro: Pick<Cobro, "estatus" | "rep_uuid" | "rep_pendiente" | "cobro_detalles">,
  cxcIndex: ReadonlyMap<number, Pick<CuentaPorCobrar, "estatus">> | null,
): string | null => {
  if (!CANCELLABLE_STATUSES.includes(cobro.estatus)) return COBRO_CANCEL_BLOCKED_BY_STATUS_MESSAGE;
  if (cobro.rep_uuid) return COBRO_CANCEL_BLOCKED_BY_REP_MESSAGE;
  if (cobro.rep_pendiente) return COBRO_CANCEL_BLOCKED_BY_PENDING_REP_MESSAGE;
  if (!cxcIndex) return COBRO_CANCEL_BLOCKED_BY_UNAVAILABLE_CXC_MESSAGE;
  const cuentas = cobro.cobro_detalles.map((linea) => cxcIndex.get(linea.cxc));
  if (cuentas.some((cuenta) => !cuenta)) return COBRO_CANCEL_BLOCKED_BY_UNAVAILABLE_CXC_MESSAGE;
  if (cuentas.some((cuenta) => cuenta?.estatus === "Cancelada")) {
    return COBRO_CANCEL_BLOCKED_BY_CANCELLED_INVOICE_MESSAGE;
  }
  return null;
};

/**
 * Aviso cuando la petición de cancelar se cortó sin respuesta del backend
 * (`isActionOutcomeUnknown`): pudo aplicarse. Reintentar es seguro: `cancelar/`
 * sobre un cobro ya `Cancelado` responde 200 sin hacer nada.
 */
export const COBRO_CANCEL_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: la cancelación pudo haberse aplicado. Actualiza los datos y, si el cobro sigue activo, vuelve a intentarlo.";

/**
 * Mensaje de un fallo de `cancelar/`. El rechazo por REP llega bajo `rep` y se
 * muestra tal cual; un corte sin respuesta avisa que pudo cancelarse; un 403
 * trae `detail` (lo cubre `firstDrfFieldMessage`). El resto (404, 500) cae en el
 * extractor genérico.
 */
export const cancelCobroErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "rep") ??
  (isActionOutcomeUnknown(error) ? COBRO_CANCEL_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar el cobro.");
