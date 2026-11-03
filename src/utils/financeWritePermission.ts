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

/**
 * Estado del permiso de escritura según la sesión:
 * - `loading`: la sesión todavía no llega. NO es "sin permiso": las acciones se
 *   muestran bloqueadas sin motivo y su guarda no avisa nada, para que un
 *   usuario con permiso no vea "No tienes permiso…" en la carga en frío.
 * - `allowed` / `denied`: ya se sabe.
 */
export type FinanceWriteAccess = "loading" | "allowed" | "denied";

/** Estado de `useSession` (`next-auth/react`). */
type SessionStatus = "loading" | "authenticated" | "unauthenticated";

/** `FinanceWriteAccess` a partir del estado y el usuario de la sesión. */
export const getFinanceWriteAccess = (
  status: SessionStatus,
  user: PermissionContext | null | undefined,
): FinanceWriteAccess => {
  if (status === "loading") return "loading";
  return canWriteFinance(user) ? "allowed" : "denied";
};
