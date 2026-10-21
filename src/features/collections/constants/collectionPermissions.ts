/**
 * Permiso que exige el backend para registrar un cobro (`perform_create` de
 * `CobroViewSet`, #581): el MISMO que timbrar o cancelar una factura. Ofrecer
 * el botón con otro código llevaría a un 403 al confirmar. La compuerta real es
 * el backend; esta es de UX.
 */
export const COBRO_CREATE_PERMISSION = "E-FIN-FACTURAS";
