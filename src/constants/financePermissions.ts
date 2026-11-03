/**
 * Permiso de ESCRITURA de Finanzas. Desde EC-711 (nucleo-erp #856, PR #879) el
 * backend exige `E-FIN-FACTURAS` en TODA escritura bajo `/finanzas/` salvo
 * Facturama (`PermisoFinanzas`), revisado antes de validar el body; sin él
 * responde `403`. Las lecturas siguen pidiendo `R-CONTABILIDAD`, así que este
 * permiso nunca gatea la navegación ni una lectura. Superusuario y admin de
 * empresa pasan siempre (`hasPermission` ya lo cubre con el rol "admin").
 *
 * Convención (EC-733): en los catálogos (bancos, cuentas bancarias, plan de
 * cuentas, centros de costo) las acciones se OCULTAN; en los flujos con estados
 * (pólizas, facturas de proveedor, conciliaciones, pagos, CxP, CxC) se muestran
 * deshabilitadas con su motivo. El botón de alta se oculta en todos. La
 * compuerta real es el backend; esta es de UX.
 */
export const FINANCE_WRITE_PERMISSION = "E-FIN-FACTURAS";

/**
 * Motivo de una acción de Finanzas deshabilitada por falta de
 * `FINANCE_WRITE_PERMISSION`: el mismo texto que el `detail` del `403` genérico
 * del backend. Pólizas y conciliaciones tienen su propio mensaje en el backend y
 * usan el suyo.
 */
export const FINANCE_WRITE_PERMISSION_REASON = "No tienes permiso para modificar datos de finanzas.";
