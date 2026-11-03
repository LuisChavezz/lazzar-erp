import toast from "react-hot-toast";
import { FINANCE_WRITE_PERMISSION } from "@/src/constants/financePermissions";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "./permissions";

/** `status` de `useSession()` de NextAuth. */
type SessionStatus = "authenticated" | "loading" | "unauthenticated";

/**
 * Estado de escritura de Finanzas para la sesión actual (EC-733). Se calcula una
 * vez por vista con `useSession()` (`{ data, status }`) y viaja a las celdas por
 * el contexto de acciones de fila.
 */
export interface FinanceWriteState {
  /** ¿Puede escribir? (`FINANCE_WRITE_PERMISSION`, rol "admin" incluido). */
  canWrite: boolean;
  /**
   * La sesión aún no llega. Se falla cerrado (`canWrite` es `false`), pero el
   * motivo de permiso NO se muestra: un admin vería "No tienes permiso…" durante
   * la carga. Mismo criterio que el `isSessionLoading` de `QuoteList`.
   */
  isSessionLoading: boolean;
}

export const getFinanceWriteState = (
  user: PermissionContext | null | undefined,
  status: SessionStatus,
): FinanceWriteState => ({
  canWrite: status === "authenticated" && hasPermission(FINANCE_WRITE_PERMISSION, user),
  isSessionLoading: status === "loading",
});

/**
 * `disabled`/`description` de un item de menú (o un botón) que escribe en
 * Finanzas, convención de los flujos: sin permiso se deshabilita con su motivo.
 * Mientras la sesión carga se deshabilita SIN motivo. Combinar con otros
 * bloqueos del item: `disabled: busy || block.disabled`.
 */
export const financeWriteBlock = (
  write: FinanceWriteState,
  reason: string,
): { disabled: boolean; description: string | undefined } =>
  write.canWrite
    ? { disabled: false, description: undefined }
    : { disabled: true, description: write.isSessionLoading ? undefined : reason };

/**
 * Guarda de los handlers: `true` si puede escribir. Si no, avisa con el motivo
 * (salvo mientras la sesión carga) y devuelve `false`. El menú ya deshabilita la
 * acción; esto cubre una sesión que cambió entre pintarlo y seleccionar.
 */
export const guardFinanceWrite = (write: FinanceWriteState, reason: string): boolean => {
  if (write.canWrite) return true;
  if (!write.isSessionLoading) toast.error(reason);
  return false;
};
