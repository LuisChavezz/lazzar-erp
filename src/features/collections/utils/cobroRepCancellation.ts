import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelacionPendienteMessage } from "@/src/utils/cancelacionPendienteMessage";
import { COBRO_REP_CANCEL_PERMISSION } from "../constants/collectionPermissions";
import type { Cobro } from "../interfaces/collection.interface";
import { isActionOutcomeUnknown } from "./actionOutcome";

type CobroRepCancelState = Pick<Cobro, "rep_uuid" | "rep_facturama_id">;

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
export const getCobroRepNotCancellableMessage = (cobro: Pick<Cobro, "id" | "rep_uuid">): string =>
  cobro.rep_uuid
    ? `El REP del cobro #${cobro.id} no tiene el id de Facturama y no se puede cancelar desde aquí: contacta a soporte.`
    : `El cobro #${cobro.id} ya no tiene un REP timbrado que cancelar.`;

/** ¿Se ofrece "Cancelar REP" a ESTE usuario para ESTE cobro? */
export const canCancelCobroRep = (
  cobro: CobroRepCancelState,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(COBRO_REP_CANCEL_PERMISSION, user) && isCobroRepCancellable(cobro);

/**
 * Aviso cuando la petición se cortó sin respuesta del backend
 * (`isActionOutcomeUnknown`): el REP pudo cancelarse ante el SAT.
 */
export const COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el REP pudo haberse cancelado ante el SAT. Actualiza los datos antes de volver a intentarlo.";

/**
 * Mensaje de un fallo de `cancelar-rep/`: primero `cancelacion_pendiente`
 * (`cancelacionPendienteMessage`; el backend no guarda ese estado del REP),
 * luego `rep` (sin REP que cancelar, empresa que no es la dueña de la cuenta de
 * Facturama, rechazo o falla de Facturama, otro estatus del SAT), tal cual. Un
 * corte sin respuesta avisa que pudo cancelarse; un 403/404 trae `detail` (lo
 * cubre `firstDrfFieldMessage`); el resto cae en el extractor genérico.
 */
export const cancelCobroRepErrorMessage = (error: unknown): string =>
  cancelacionPendienteMessage(error) ??
  drfFieldMessage(error, "rep") ??
  (isActionOutcomeUnknown(error) ? COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar el REP.");
