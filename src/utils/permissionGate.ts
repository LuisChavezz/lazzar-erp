/**
 * Estado de un control que depende de un permiso de la sesión (EC-895):
 * - `pending`: la sesión carga o se está recuperando; todavía no se sabe. No se
 *   ofrece la acción, pero tampoco se dice que esté prohibida.
 * - `allowed` / `denied`: la sesión ya resolvió.
 */
export type PermissionGate = "pending" | "allowed" | "denied";

/**
 * ¿Todavía no hay permisos que leer? La sesión carga (`status: "loading"`) o
 * `SessionRecoveryProvider` la está reintentando (`phase: "recovering"`). Misma
 * regla que el sidebar (`useSidebarSections`) y `useRouteAccess`.
 */
export const isSessionAccessPending = (status: string, recoveryPhase: string): boolean =>
  status === "loading" || recoveryPhase === "recovering";

/** Combina "¿ya se sabe?" con "¿lo tiene?" en un solo estado. */
export const permissionGate = (isPending: boolean, allowed: boolean): PermissionGate =>
  isPending ? "pending" : allowed ? "allowed" : "denied";
