import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
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

/** ¿Se ofrece "Cancelar REP" a ESTE usuario para ESTE cobro? */
export const canCancelCobroRep = (
  cobro: CobroRepCancelState,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(COBRO_REP_CANCEL_PERMISSION, user) && isCobroRepCancellable(cobro);

/**
 * Mensaje del backend cuando el SAT dejó la cancelación en `requested`: el
 * receptor debe aceptarla. Se reconoce por su LLAVE (`cancelacion_pendiente`),
 * nunca por el texto, y se muestra tal cual. El backend no guarda ese estado:
 * el REP sigue vigente y el cobro se ve igual que antes.
 */
export const cancelCobroRepRequestedMessage = (error: unknown): string | undefined =>
  drfFieldMessage(error, "cancelacion_pendiente");

/**
 * Aviso cuando la petición se cortó sin respuesta del backend
 * (`isActionOutcomeUnknown`): el REP pudo cancelarse ante el SAT.
 */
export const COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el REP pudo haberse cancelado ante el SAT. Actualiza los datos antes de volver a intentarlo.";

/**
 * Mensaje de un fallo de `cancelar-rep/`: primero `cancelacion_pendiente`,
 * luego `rep` (sin REP que cancelar, empresa que no es la dueña de la cuenta de
 * Facturama, rechazo o falla de Facturama, otro estatus del SAT), tal cual. Un
 * corte sin respuesta avisa que pudo cancelarse; un 403/404 trae `detail` (lo
 * cubre `firstDrfFieldMessage`); el resto cae en el extractor genérico.
 */
export const cancelCobroRepErrorMessage = (error: unknown): string =>
  cancelCobroRepRequestedMessage(error) ??
  drfFieldMessage(error, "rep") ??
  (isActionOutcomeUnknown(error) ? COBRO_REP_CANCEL_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo cancelar el REP.");
