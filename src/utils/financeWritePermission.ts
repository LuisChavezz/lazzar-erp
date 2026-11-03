import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";

/**
 * Permiso de ESCRITURA de Finanzas. Desde EC-711 (nucleo-erp #856) el backend
 * lo exige en TODA escritura de `/finanzas/` (`PermisoFinanzas`: `POST`, `PUT`,
 * `PATCH`, `DELETE` y acciones como `cancelar/`, `cerrar/`, `timbrar/`),
 * revisado antes de validar el body; sin él responde `403`. Las lecturas piden
 * `R-CONTABILIDAD`, igual que los `POST` que solo calculan (`polizas/{id}/
 * validar-cuadre/`). Superusuario y admin de empresa pasan siempre (en la
 * sesión, rol "admin", que `hasPermission` ya resuelve).
 *
 * Base compartida de los módulos de Finanzas (pólizas, conciliaciones, notas de
 * crédito): cada uno pone su propio motivo (`financeWriteDeniedReason`) con el
 * texto que el backend usa para ese recurso. La compuerta real es el backend;
 * esta es de UX.
 */
export const FINANCE_WRITE_PERMISSION = "E-FIN-FACTURAS";

/** ¿Puede ESTE usuario escribir en Finanzas? (`FINANCE_WRITE_PERMISSION`, rol "admin" incluido). */
export const canWriteFinance = (user: PermissionContext | null | undefined): boolean =>
  hasPermission(FINANCE_WRITE_PERMISSION, user);

/**
 * Motivo de una escritura bloqueada sin el permiso, con la acción del recurso
 * (`"registrar o cancelar pólizas"`): el mismo texto que el `403` del backend
 * para ese viewset (`mensaje_sin_permiso_escritura`).
 */
export const financeWriteDeniedReason = (accion: string): string =>
  `No tienes permiso para ${accion}.`;
