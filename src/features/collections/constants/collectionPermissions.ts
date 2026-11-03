/**
 * Permiso para descargar el XML/PDF del REP: el del passthrough de Facturama
 * (`PuedeUsarFacturama`). El backend exige además que el usuario sea de la
 * empresa dueña de la cuenta, algo que el frontend no conoce, así que un admin
 * de otra empresa ve los botones y recibe 403.
 */
export const COBRO_REP_DOWNLOAD_PERMISSION = "R-FIN-FACTURAMA";
