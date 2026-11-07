import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { FINANCE_WRITE_PERMISSION } from "@/src/constants/financePermissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { getLockedSatCancelMotive, type SatCancelMotive } from "@/src/constants/satCancelMotives";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import type { InvoiceEstatus } from "../interfaces/invoice.interface";
import { isInvoiceStamped } from "./invoiceStamping";

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
 * (`FINANCE_WRITE_PERMISSION`) + `isInvoiceCancellable`.
 */
export const canCancelInvoice = (
  invoice: Parameters<typeof isInvoiceCancellable>[0],
  user: PermissionContext | null | undefined,
): boolean => hasPermission(FINANCE_WRITE_PERMISSION, user) && isInvoiceCancellable(invoice);

/**
 * Explicación de "Cancelar factura" deshabilitado con un timbrado sin
 * confirmar (`cfdi_pendiente`): puede haber un CFDI vigente ante el SAT que
 * `cancelar/` no cancelaría, porque la factura no tiene `cfdi_uuid`. El backend
 * también la rechaza (`400 {"cfdi": [...]}`); el front lo explica antes.
 */
export const INVOICE_CANCEL_BLOCKED_BY_PENDING_STAMP_MESSAGE =
  "No se puede cancelar mientras el timbrado está pendiente de confirmación. Usa \"Conciliar con Facturama\" en el detalle de la factura.";

/**
 * Motivo por el que "Cancelar factura" está BLOQUEADO, o `null` si no lo está.
 * Solo el timbrado sin confirmar (`cfdi_pendiente`) lo bloquea: una factura
 * timbrada SÍ se cancela (`cancelar/` cancela antes su CFDI ante el SAT).
 * Fuente única para la cabecera del detalle, el menú del listado y el precheck
 * de `useCancelInvoice` (la fila del listado también trae `cfdi_pendiente`).
 */
export const getInvoiceCancelBlockReason = (invoice: {
  cfdi_pendiente?: boolean;
}): string | null =>
  invoice.cfdi_pendiente === true ? INVOICE_CANCEL_BLOCKED_BY_PENDING_STAMP_MESSAGE : null;

/**
 * ¿El CFDI ya está cancelado ante el SAT? `cancelar/` lo guarda aparte, antes
 * de cancelar en el ERP. Viene en el retrieve y en el listado.
 */
export const isInvoiceCfdiCancelled = (invoice: { cfdi_cancelado?: boolean }): boolean =>
  invoice.cfdi_cancelado === true;

/**
 * ¿La cancelación del CFDI está SOLICITADA y esperando a que el receptor la
 * acepte ante el SAT? `cfdi_cancelacion_solicitada` sin `cfdi_cancelado` (un
 * CFDI ya cancelado no espera nada). Sirve la fila del listado y el retrieve.
 */
export const isInvoiceCfdiCancellationRequested = (invoice: {
  cfdi_cancelacion_solicitada?: boolean;
  cfdi_cancelado?: boolean;
}): boolean => invoice.cfdi_cancelacion_solicitada === true && !isInvoiceCfdiCancelled(invoice);

/** Indicador de la cabecera del detalle y de la fila del listado. */
export const INVOICE_CFDI_CANCELLATION_REQUESTED_LABEL = "Cancelación pendiente de aceptar";

/** Explicación del indicador (nota de la cabecera y `title` en el listado). */
export const INVOICE_CFDI_CANCELLATION_REQUESTED_HINT =
  "Se solicitó cancelar el CFDI ante el SAT; falta que el receptor la acepte.";

/**
 * Aviso del diálogo cuando la cancelación ya está solicitada: confirmar vuelve
 * a pedirla ante el SAT, y la factura solo se cancela si ya fue aceptada.
 */
export const INVOICE_CANCEL_ALREADY_REQUESTED_MESSAGE =
  "La cancelación del CFDI ya se solicitó y está pendiente de que el receptor la acepte. Si confirmas, se volverá a consultar al SAT: la factura solo se cancelará si el receptor ya la aceptó.";

/** Aviso del diálogo: timbrada y con el CFDI aún vigente, `cancelar/` llama primero al SAT. */
export const INVOICE_CANCEL_SAT_FIRST_MESSAGE =
  "Primero se cancelará el CFDI ante el SAT con el motivo que elijas. Si el SAT no lo cancela, la factura no cambia.";

/** Aviso del diálogo: el SAT ya canceló el CFDI, falta la parte del ERP (no se vuelve a llamar al SAT). */
export const INVOICE_CANCEL_ERP_ONLY_MESSAGE =
  "El CFDI ya está cancelado ante el SAT; solo falta cancelar la factura en el ERP.";

/**
 * El ÚNICO aviso del diálogo de cancelación sobre el CFDI, o `null` sin CFDI:
 * ya cancelado ante el SAT (solo falta el ERP), con la cancelación ya
 * solicitada (confirmar vuelve a consultar al SAT) o vigente (primero el SAT).
 * Si a la fila le faltara `cfdi_cancelado`, una timbrada muestra el de
 * "primero el SAT": el backend igual se salta el SAT si ya estaba cancelado.
 */
export const getInvoiceCancelCfdiNotice = (invoice: {
  cfdi_uuid?: string | null;
  cfdi_cancelado?: boolean;
  cfdi_cancelacion_solicitada?: boolean;
}): string | null => {
  if (!isInvoiceStamped(invoice)) return null;
  if (isInvoiceCfdiCancelled(invoice)) return INVOICE_CANCEL_ERP_ONLY_MESSAGE;
  return isInvoiceCfdiCancellationRequested(invoice)
    ? INVOICE_CANCEL_ALREADY_REQUESTED_MESSAGE
    : INVOICE_CANCEL_SAT_FIRST_MESSAGE;
};

/**
 * ¿`cancelar/` va a cancelar un CFDI VIGENTE ante el SAT? Timbrada y sin
 * `cfdi_cancelado`: es el caso en que el backend exige `motivo_sat` y el
 * diálogo muestra el selector. Con el CFDI ya cancelado el backend se salta
 * el SAT; sin timbrar no hay CFDI.
 */
export const willInvoiceCancelReachSat = (invoice: {
  cfdi_uuid?: string | null;
  cfdi_cancelado?: boolean;
}): boolean => isInvoiceStamped(invoice) && !isInvoiceCfdiCancelled(invoice);

/**
 * Motivo SAT FIJO de la cancelación del CFDI (`getLockedSatCancelMotive`), o
 * `null` si se puede elegir: con la cancelación solicitada o con un intento
 * en curso o sin respuesta (`cfdi_cancelacion_en_curso_desde`, solo en el
 * retrieve). Sirve la fila del listado (sin la reserva) y el retrieve.
 */
export const getInvoiceLockedSatCancelMotive = (invoice: {
  cfdi_cancelacion_solicitada?: boolean;
  cfdi_cancelacion_motivo?: string | null;
  cfdi_cancelacion_en_curso_desde?: string | null;
}): SatCancelMotive | null =>
  getLockedSatCancelMotive({
    requested: invoice.cfdi_cancelacion_solicitada,
    motive: invoice.cfdi_cancelacion_motivo,
    inFlightSince: invoice.cfdi_cancelacion_en_curso_desde,
  });

/**
 * ¿Hay que detener la cancelación para volver a confirmar porque el motivo SAT
 * quedó fijo en otro distinto del elegido? Pasa cuando, después de abrir el
 * diálogo, se pidió la cancelación o quedó un intento sin respuesta (el
 * listado no trae esa reserva): el backend rechazaría el motivo elegido. Sin
 * motivo elegido (`null`: la llamada no iba al SAT) no detiene nada.
 */
export const isSatCancelMotiveLockedElsewhere = (
  current: Parameters<typeof getInvoiceLockedSatCancelMotive>[0],
  chosen: SatCancelMotive | null,
): boolean => {
  if (chosen === null) return false;
  const locked = getInvoiceLockedSatCancelMotive(current);
  return locked !== null && locked !== chosen;
};

/** Aviso cuando el precheck encontró el motivo SAT fijo en otro después de abrir el diálogo. */
export const INVOICE_CANCEL_MOTIVE_LOCKED_SINCE_OPENED_MESSAGE =
  "El motivo de cancelación ante el SAT quedó fijo después de abrir este diálogo. Revisa el motivo y confirma de nuevo.";

/** Estado del CFDI en la cabecera del detalle cuando `cfdi_cancelado`. */
export const INVOICE_CFDI_CANCELLED_LABEL = "Cancelado ante el SAT";

/** Nota de la cabecera: CFDI cancelado ante el SAT pero la factura sigue `Emitida`. */
export const INVOICE_CFDI_CANCELLED_ERP_PENDING_MESSAGE =
  "La factura sigue Emitida: falta cancelarla en el ERP.";

/**
 * Estado del CFDI en la cabecera de una factura `Cancelada` con `cfdi_uuid` y
 * SIN `cfdi_cancelado` (p. ej. cancelada antes de que `cancelar/` cancelara el
 * CFDI ante el SAT): el CFDI sigue vigente. Se cancela con "Cancelar CFDI ante
 * el SAT" (`canCancelCancelledInvoiceCfdi`).
 */
export const INVOICE_CFDI_VALID_LABEL = "Vigente ante el SAT";

/** Nota de la cabecera para ese caso. */
export const INVOICE_CFDI_VALID_AFTER_ERP_CANCEL_MESSAGE =
  "La factura se canceló en el ERP, pero su CFDI no se canceló ante el SAT.";

// ── CFDI vigente de una factura ya Cancelada (EC-764) ────────────────────────

/** Etiqueta de la acción en el menú del listado y en la cabecera del detalle. */
export const CANCEL_CANCELLED_INVOICE_CFDI_LABEL = "Cancelar CFDI ante el SAT";

/**
 * ¿Se ofrece cancelar ante el SAT el CFDI de una factura que YA está
 * `Cancelada` en el ERP? Solo si está activa, tiene `cfdi_uuid`, el CFDI no
 * está cancelado y no hay un timbrado sin confirmar. Incluye la cancelación ya
 * solicitada (`cfdi_cancelacion_solicitada`): volver a pedirla consulta al SAT
 * si el receptor ya la aceptó.
 *
 * Para esa factura, `cancelar/` solo cancela el CFDI y regresa antes de tocar
 * el ERP: no cambia estatus, CxC, inventario ni póliza. Exige `motivo_sat`
 * como cualquier cancelación de un CFDI vigente; la nota interna `motivo`, si
 * se manda, la guarda en `observaciones` (EC-806). Los flags desconocidos (`undefined`) cuentan como NO elegibles:
 * ante la duda no se ofrece una acción irreversible. Nunca coincide con
 * `isInvoiceCancellable` (Borrador o Emitida), así que las dos acciones no
 * aparecen juntas.
 */
export const isCancelledInvoiceCfdiCancellable = (invoice: {
  activo?: boolean;
  estatus: InvoiceEstatus | string;
  cfdi_uuid?: string | null;
  cfdi_cancelado?: boolean;
  cfdi_pendiente?: boolean;
}): boolean =>
  invoice.activo === true &&
  invoice.estatus === INVOICE_STATUS.CANCELADA &&
  isInvoiceStamped(invoice) &&
  invoice.cfdi_cancelado === false &&
  invoice.cfdi_pendiente === false;

/** `isCancelledInvoiceCfdiCancellable` + permiso (`FINANCE_WRITE_PERMISSION`). */
export const canCancelCancelledInvoiceCfdi = (
  invoice: Parameters<typeof isCancelledInvoiceCfdiCancellable>[0],
  user: PermissionContext | null | undefined,
): boolean =>
  hasPermission(FINANCE_WRITE_PERMISSION, user) && isCancelledInvoiceCfdiCancellable(invoice);

/**
 * Por qué el retrieve fresco ya no deja cancelar el CFDI de esa factura (el
 * precheck de `useCancelCancelledInvoiceCfdi` no hace el POST).
 */
export const cancelledInvoiceCfdiNotCancellableMessage = (invoice: {
  id: number;
  folio: string | null;
  activo?: boolean;
  estatus: InvoiceEstatus | string;
  cfdi_uuid?: string | null;
  cfdi_cancelado?: boolean;
  cfdi_pendiente?: boolean;
}): string => {
  const label = invoice.folio || `#${invoice.id}`;
  if (isInvoiceCfdiCancelled(invoice)) {
    return `El CFDI de la factura ${label} ya estaba cancelado ante el SAT.`;
  }
  if (invoice.cfdi_pendiente === true) return INVOICE_CANCEL_BLOCKED_BY_PENDING_STAMP_MESSAGE;
  if (invoice.activo !== true) {
    return `La factura ${label} fue eliminada; su CFDI ya no puede cancelarse desde el ERP.`;
  }
  if (!isInvoiceStamped(invoice)) return `La factura ${label} no tiene un CFDI timbrado.`;
  return `La factura ${label} ya no está cancelada en el ERP; recarga para ver su estado.`;
};

/** Aviso del diálogo con la cancelación ya solicitada: confirmar vuelve a consultar al SAT. */
export const CANCELLED_INVOICE_CFDI_ALREADY_REQUESTED_MESSAGE =
  "La cancelación del CFDI ya se solicitó y está pendiente de que el receptor la acepte. Si confirmas, se volverá a consultar al SAT si ya la aceptó.";

/**
 * Mensaje de un fallo de `cancelar/`. El backend pone el motivo bajo `cfdi`
 * (el SAT o Facturama no cancelaron el CFDI o no respondieron, otra
 * cancelación en curso, CFDI sin id de Facturama), bajo `motivo_sat` (falta,
 * no es del catálogo o no es el ya fijado, EC-806) o bajo `estatus` (notas de
 * crédito emitidas), como string o como lista;
 * `drfFieldMessage` lee las dos formas. Ninguno de esos `400` guarda nada. El
 * caso en que el receptor debe aceptar llega bajo `cancelacion_pendiente` y no
 * es un fallo: `useCancelInvoice` lo separa antes
 * (`cancelacionPendienteMessage`); aunque llega como `400`, el backend SÍ
 * guardó `cfdi_cancelacion_solicitada`. El mensaje se muestra tal cual, sin
 * distinguir casos por su texto. Si no viene ninguno (403, 404, 500, red), cae
 * en el extractor genérico.
 */
export const cancelInvoiceErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "cfdi") ??
  drfFieldMessage(error, "motivo_sat") ??
  drfFieldMessage(error, "estatus") ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar la factura.");
