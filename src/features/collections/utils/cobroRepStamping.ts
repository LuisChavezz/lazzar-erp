import { isAxiosError } from "axios";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { drfFieldMessage, firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { COBRO_REP_STAMP_PERMISSION } from "../constants/collectionPermissions";
import type { Cobro } from "../interfaces/collection.interface";

type CobroRepState = Pick<Cobro, "estatus" | "activo" | "rep_uuid" | "rep_pendiente">;

/**
 * ¿Se ofrece "Timbrar REP" para este cobro? Solo un cobro `Aplicado`, ACTIVO,
 * sin REP y sin un timbrado pendiente de confirmación: las mismas condiciones
 * del cobro que valida el backend.
 *
 * Las reglas POR FACTURA (timbrada, PPD, mismo receptor) no se evalúan aquí: el
 * cobro no trae esos datos y el backend responde 400 con el motivo en `rep`,
 * que se muestra tal cual.
 */
export const isCobroRepStampable = (cobro: CobroRepState): boolean =>
  cobro.estatus === "Aplicado" && cobro.activo === true && !cobro.rep_uuid && !cobro.rep_pendiente;

/** ¿Se ofrece "Timbrar REP" a ESTE usuario para ESTE cobro? */
export const canStampCobroRep = (
  cobro: CobroRepState,
  user: PermissionContext | null | undefined,
): boolean => hasPermission(COBRO_REP_STAMP_PERMISSION, user) && isCobroRepStampable(cobro);

/**
 * ¿Hay un timbrado del REP SIN CONFIRMAR? El backend marca `rep_pendiente`
 * cuando Facturama no confirmó (timeout, red, 5xx o respuesta sin UUID): el REP
 * pudo generarse ante el SAT aunque el cobro no tenga `rep_uuid`. Mientras siga
 * marcado, `timbrar-rep/` lo rechaza y solo soporte puede resolverlo.
 */
export const isCobroRepPending = (cobro: Pick<Cobro, "rep_uuid" | "rep_pendiente">): boolean =>
  cobro.rep_pendiente === true && !cobro.rep_uuid;

/** Nota en lugar del botón mientras el timbrado del REP está pendiente de confirmación. */
export const COBRO_REP_PENDING_MESSAGE =
  "El timbrado del REP está pendiente de confirmación con Facturama. Soporte debe revisarlo antes de volver a timbrar.";

/**
 * Aviso cuando la petición de timbrado se cortó sin respuesta del backend: el
 * servidor pudo llegar a timbrar ante el SAT sin alcanzar a guardarlo.
 */
export const COBRO_REP_UNCONFIRMED_MESSAGE =
  "No se recibió respuesta del servidor: el REP pudo haberse timbrado ante el SAT. No vuelvas a intentarlo; consulta con soporte antes de timbrar de nuevo.";

/** Estatus de una puerta de enlace que cortó la petición (no responde Django). */
const GATEWAY_STATUSES = new Set([502, 503, 504]);

/**
 * ¿El POST se cortó sin una respuesta del backend? Sin respuesta (red caída,
 * CORS por un corte), timeout del cliente o un 502/503/504 de la puerta de
 * enlace: en todos el resultado del timbrado es desconocido.
 */
const isStampOutcomeUnknown = (error: unknown): boolean => {
  if (!isAxiosError(error)) return false;
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") return true;
  if (!error.response) return true;
  return GATEWAY_STATUSES.has(error.response.status);
};

/**
 * Mensaje de un fallo de `timbrar-rep/`. Todo error de negocio llega bajo `rep`
 * (string o lista) y se muestra tal cual, sin interpretarlo; un 403 trae
 * `detail` (lo cubre `firstDrfFieldMessage`). Un corte sin respuesta avisa que
 * el REP pudo timbrarse; el resto (404, 500) cae en el extractor genérico.
 */
export const stampCobroRepErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "rep") ??
  (isStampOutcomeUnknown(error) ? COBRO_REP_UNCONFIRMED_MESSAGE : undefined) ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo timbrar el REP.");
