import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelacionPendienteMessage } from "@/src/utils/cancelacionPendienteMessage";
import { FINANCE_WRITE_PERMISSION } from "@/src/constants/financePermissions";
import {
  getLockedSatCancelMotive,
  isSatCancelMotiveLockedElsewhere,
  type SatCancelMotive,
} from "@/src/constants/satCancelMotives";
import type { Cobro } from "../interfaces/collection.interface";
import { isActionOutcomeUnknown } from "./actionOutcome";
import { cobroLabel } from "./collection.utils";

type CobroRepCancelState = Pick<Cobro, "rep_uuid" | "rep_facturama_id">;

/**
 * Indicador de la cancelación del REP que espera la aceptación del receptor
 * (`rep_cancelacion_solicitada`): mismo texto que el de una factura en ese
 * estado. El REP sigue vigente hasta que la acepte y se resuelve volviendo a
 * cancelarlo; no es un estado obsoleto.
 */
export const COBRO_REP_CANCELLATION_REQUESTED_LABEL = "Cancelación pendiente de aceptar";

/** Explicación del indicador (`title` en el listado y nota del detalle). */
export const COBRO_REP_CANCELLATION_REQUESTED_HINT =
  "Se solicitó cancelar el REP ante el SAT; falta que el receptor la acepte.";

/**
 * ¿Se puede cancelar el REP de este cobro? Exactamente la guarda del backend:
 * UUID e id de Facturama, los dos. A propósito NO filtra por `estatus`: el
 * backend cancela el REP de un cobro en cualquier estatus, incluido un
 * `Cancelado` antiguo que aún conserve su REP vigente ante el SAT.
 */
export const isCobroRepCancellable = (cobro: CobroRepCancelState): boolean =>
  Boolean(cobro.rep_uuid) && Boolean(cobro.rep_facturama_id);

/**
 * Por qué NO se puede cancelar el REP de este cobro (`isCobroRepCancellable`
 * en falso), según su estado: sin UUID ya no hay REP; con UUID pero sin id de
 * Facturama, `cancelar-rep/` tampoco lo acepta y solo soporte lo resuelve.
 */
export const getCobroRepNotCancellableMessage = (cobro: Pick<Cobro, "id" | "folio" | "rep_uuid">): string =>
  cobro.rep_uuid
    ? `El REP del cobro ${cobroLabel(cobro)} no tiene el id de Facturama y no se puede cancelar desde aquí: contacta a soporte.`
    : `El cobro ${cobroLabel(cobro)} ya no tiene un REP timbrado que cancelar.`;

/**
 * Motivo SAT FIJO de la cancelación del REP (`getLockedSatCancelMotive`), o
 * `null` si se puede elegir: con la cancelación solicitada o con un intento en
 * curso o sin respuesta (`rep_cancelacion_en_curso_desde`). El listado y el
 * retrieve de cobros traen los tres campos.
 */
export const getCobroRepLockedSatCancelMotive = (
  cobro: Pick<Cobro, "rep_cancelacion_solicitada" | "rep_cancelacion_motivo" | "rep_cancelacion_en_curso_desde">,
): SatCancelMotive | null =>
  getLockedSatCancelMotive({
    requested: cobro.rep_cancelacion_solicitada,
    motive: cobro.rep_cancelacion_motivo,
    inFlightSince: cobro.rep_cancelacion_en_curso_desde,
  });

/**
 * Qué decide el precheck de "Cancelar REP" con el cobro FRESCO, antes del POST:
 * `not-cancellable` (ya no hay REP cancelable), `needs-confirmation` (el motivo
 * SAT quedó fijo en otro distinto del elegido después de abrir el diálogo,
 * igual que en facturas) o `null` (se puede hacer el POST).
 */
export const getCobroRepCancelPrecheck = (
  current: Parameters<typeof isCobroRepCancellable>[0] &
    Parameters<typeof getCobroRepLockedSatCancelMotive>[0],
  motivoSat: SatCancelMotive,
): "not-cancellable" | "needs-confirmation" | null => {
  if (!isCobroRepCancellable(current)) return "not-cancellable";
  if (isSatCancelMotiveLockedElsewhere(getCobroRepLockedSatCancelMotive(current), motivoSat)) {
    return "needs-confirmation";
  }
  return null;
};

/** ¿Se ofrece "Cancelar REP" a ESTE usuario para ESTE cobro? */
export const canCancelCobroRep = (
  cobro: CobroRepCancelState,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(FINANCE_WRITE_PERMISSION, user) && isCobroRepCancellable(cobro);

/**
 * Aviso cuando la petición se cortó sin respuesta del backend
 * (`isActionOutcomeUnknown`): el REP pudo cancelarse ante el SAT.
 */
export const COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el REP pudo haberse cancelado ante el SAT. Actualiza los datos antes de volver a intentarlo.";

/**
 * Mensaje de un fallo de `cancelar-rep/`: primero `cancelacion_pendiente`
 * (`cancelacionPendienteMessage`; el backend guarda `rep_cancelacion_solicitada`
 * y el motivo), luego `rep` (sin REP que cancelar, empresa que no es la dueña
 * de la cuenta de Facturama, rechazo de Facturama, otro estatus del SAT, otra
 * cancelación en curso), `rep_incierto` (Facturama no respondió: la reserva y
 * el motivo se quedan) y `motivo_sat` (falta, no es del catálogo o no es el ya
 * fijado), tal cual (EC-806). Un corte sin respuesta del backend avisa que pudo
 * cancelarse; un 403/404 trae `detail` (lo cubre `firstDrfFieldMessage`); el
 * resto cae en el extractor genérico.
 */
export const cancelCobroRepErrorMessage = (error: unknown): string =>
  cancelacionPendienteMessage(error) ??
  drfFieldMessage(error, "rep") ??
  drfFieldMessage(error, "rep_incierto") ??
  drfFieldMessage(error, "motivo_sat") ??
  (isActionOutcomeUnknown(error) ? COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar el REP.");
