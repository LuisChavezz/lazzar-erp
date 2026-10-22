/**
 * Permiso que exige el backend para registrar un cobro (`perform_create` de
 * `CobroViewSet`, #581): el MISMO que timbrar o cancelar una factura. Ofrecer
 * el botón con otro código llevaría a un 403 al confirmar. La compuerta real es
 * el backend; esta es de UX.
 */
export const COBRO_CREATE_PERMISSION = "E-FIN-FACTURAS";

/**
 * Permiso para timbrar el REP de un cobro (`timbrar-rep/`). El backend lo exige
 * en todo método que no sea de lectura de `CobroViewSet`, así que es el mismo
 * código; sin él responde 403.
 */
export const COBRO_REP_STAMP_PERMISSION = "E-FIN-FACTURAS";

/**
 * Permiso para cancelar el REP de un cobro (`cancelar-rep/`): el mismo código
 * que exige `CobroViewSet` en todo método que no sea de lectura. NO pide
 * `R-FIN-FACTURAMA` (ese solo es para descargar el archivo).
 */
export const COBRO_REP_CANCEL_PERMISSION = "E-FIN-FACTURAS";

/**
 * Permiso para cancelar un cobro (`cancelar/`): el mismo código que exige
 * `CobroViewSet` en todo método que no sea de lectura; sin él responde 403.
 */
export const COBRO_CANCEL_PERMISSION = "E-FIN-FACTURAS";

/**
 * Permiso para descargar el XML/PDF del REP: el del passthrough de Facturama
 * (`PuedeUsarFacturama`). El backend exige además que el usuario sea de la
 * empresa dueña de la cuenta, algo que el frontend no conoce, así que un admin
 * de otra empresa ve los botones y recibe 403.
 */
export const COBRO_REP_DOWNLOAD_PERMISSION = "R-FIN-FACTURAMA";
