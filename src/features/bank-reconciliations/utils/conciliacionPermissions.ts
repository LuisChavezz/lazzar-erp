import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { INVOICE_WRITE_PERMISSION } from "@/src/features/invoicing/constants/invoicePermissions";

/**
 * Permiso de ESCRITURA de conciliaciones bancarias: preparar, cerrar y
 * cancelar. El backend exige `E-FIN-FACTURAS` en toda escritura de
 * `conciliaciones-bancarias/` (#826/#827; desde EC-711 en toda escritura de
 * Finanzas, `PermisoFinanzas`) y responde `403` antes de validar el body: las
 * tres cambian el estatus de los movimientos del banco. El mismo código que
 * `INVOICE_WRITE_PERMISSION`.
 */
export const CONCILIACION_WRITE_PERMISSION = INVOICE_WRITE_PERMISSION;

/**
 * ¿Puede ESTE usuario escribir conciliaciones? (`CONCILIACION_WRITE_PERMISSION`,
 * rol "admin" incluido). Convención de EC-713 (notas de crédito): sin él,
 * "+ Preparar conciliación" se oculta y las acciones del menú se muestran
 * deshabilitadas con su motivo.
 */
export const canWriteConciliaciones = (user: PermissionContext | null | undefined): boolean =>
  hasPermission(CONCILIACION_WRITE_PERMISSION, user);

/** Por qué una acción de escritura está bloqueada cuando `canWriteConciliaciones` es `false`. */
export const CONCILIACION_WRITE_PERMISSION_REASON =
  "No tienes permiso para conciliar cuentas bancarias.";
