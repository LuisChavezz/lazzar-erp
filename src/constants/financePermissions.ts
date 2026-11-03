/**
 * Permiso de LECTURA de Finanzas (módulo). Lectura jerárquica, igual que el
 * backend (`PermisoFinanzas`, nucleo-erp EC-746): `R-CONTABILIDAD` lee TODO
 * Finanzas; un subcódigo de sección lee SOLO su sección. Las pantallas sin
 * código de sección propio (bancos, notas de crédito, CxP, pólizas…) siguen
 * pidiendo `R-CONTABILIDAD` a secas.
 */
export const FINANCE_READ_PERMISSION = "R-CONTABILIDAD";

/** Subcódigos de lectura por sección (el backend acepta estos y ninguno más). */
export const FINANCE_SECTION_READ = {
  invoicing: "R-CONTABILIDAD-FACTURACION",
  /** Lo comparten Cuentas por cobrar y Cobros (también en el backend). */
  receivables: "R-CONTABILIDAD-CXC",
  accountingCustomers: "R-CONTABILIDAD-CLIENTES",
} as const;

/**
 * Códigos que abren la lectura de una sección: su subcódigo O el de módulo.
 * Es una regla "cualquiera de" (`hasAnyPermission`), la misma forma que ya
 * aceptan `routePermissions` y `AppRouteItem.permission`.
 */
export const financeSectionReadPermissions = (
  section: keyof typeof FINANCE_SECTION_READ,
): string[] => [FINANCE_SECTION_READ[section], FINANCE_READ_PERMISSION];

/**
 * Permiso de ESCRITURA de Finanzas. Desde EC-711 (nucleo-erp #856, PR #879) el
 * backend exige `E-FIN-FACTURAS` en TODA escritura bajo `/finanzas/` salvo
 * Facturama (`PermisoFinanzas`), revisado antes de validar el body; sin él
 * responde `403`. Las lecturas van por `FINANCE_READ_PERMISSION` y los
 * subcódigos de sección (arriba), así que este permiso nunca gatea la
 * navegación ni una lectura. Superusuario y admin de
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
 * del backend (pagos, CxP, CxC, facturas de proveedor). Pólizas y conciliaciones
 * tienen su propio mensaje en el backend (`mensaje_sin_permiso_escritura`) y
 * usan el suyo, abajo.
 */
export const FINANCE_WRITE_PERMISSION_REASON = "No tienes permiso para modificar datos de finanzas.";

/** Motivo en pólizas: el `detail` del `403` de `PolizaViewSet`. */
export const POLIZA_WRITE_PERMISSION_REASON = "No tienes permiso para registrar o cancelar pólizas.";

/** Motivo en conciliaciones: el `detail` del `403` de `ConciliacionBancariaViewSet`. */
export const CONCILIACION_WRITE_PERMISSION_REASON = "No tienes permiso para conciliar cuentas bancarias.";
