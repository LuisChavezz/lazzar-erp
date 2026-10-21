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
 * Mensaje de un fallo de `timbrar-rep/`. Todo error de negocio llega bajo `rep`
 * (string o lista); un 403 trae `detail`. Si no viene ninguno (404, 500, red),
 * cae en el extractor genérico. El texto se muestra tal cual, sin interpretarlo.
 */
export const stampCobroRepErrorMessage = (error: unknown): string =>
  drfFieldMessage(error, "rep") ??
  drfFieldMessage(error, "detail") ??
  firstDrfFieldMessage(error) ??
  extractErrorMessage(error, "No se pudo timbrar el REP.");
