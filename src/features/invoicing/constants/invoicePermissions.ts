/**
 * Permiso de ESCRITURA de facturación: desde EC-711 (nucleo-erp #856) el
 * backend exige `E-FIN-FACTURAS` en toda escritura de Finanzas, revisado antes
 * de validar el body (`PermisoFinanzas`); sin él responde `403`. En este módulo
 * rige "Nueva Factura" (`POST /finanzas/facturas/onboarding/`) y "Enviar CFDI"
 * (`POST /finanzas/facturas/{id}/enviar-cfdi/`); emitir, timbrar y cancelar
 * usan su propia constante con el mismo código (`INVOICE_EMIT_PERMISSION`,
 * `INVOICE_STAMP_PERMISSION`, `INVOICE_CANCEL_PERMISSION`).
 *
 * Convención del módulo: una acción sin permiso se OCULTA. "Enviar correo" no
 * escribe en Finanzas (lo manda Google) y sigue con el permiso de lectura de la
 * sección. La compuerta real es el backend; esta es de UX.
 */
export const INVOICE_WRITE_PERMISSION = "E-FIN-FACTURAS";
