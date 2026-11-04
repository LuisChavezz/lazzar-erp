import type { PermissionContext } from "../interfaces/permission-context.interface";
import { meetsPermissionRequirement, type PermissionRequirement } from "./permissions";

/** `status` de `useSession()` de NextAuth. */
export type SessionStatus = "authenticated" | "loading" | "unauthenticated";

/**
 * Compuerta de Finanzas por sesión y permiso (EC-734): la ÚNICA definición de
 * "falla cerrado mientras la sesión carga, y entonces sin afirmar que falta el
 * permiso". La usa la LECTURA entre secciones —una pantalla que lee datos de
 * OTRA sección (un selector, un detalle enlazado) solo lo hace si el usuario
 * tiene el código de esa sección, su subcódigo o `R-CONTABILIDAD`; si no, la
 * pieza queda deshabilitada con su motivo y la consulta no se dispara— y la
 * ESCRITURA (`getFinanceWriteState`/`financeWriteBlock` delegan aquí con
 * `FINANCE_WRITE_PERMISSION`).
 */
export interface FinanceReadState {
  /** Sesión cargada y con el requisito. Falla cerrado mientras carga. */
  canRead: boolean;
  /** La sesión aún carga: deshabilitar sin afirmar "No tienes permiso…". */
  isSessionLoading: boolean;
}

export const getFinanceReadState = (
  user: PermissionContext | null | undefined,
  status: SessionStatus,
  requirement: PermissionRequirement,
): FinanceReadState => ({
  canRead: status === "authenticated" && meetsPermissionRequirement(requirement, user),
  isSessionLoading: status === "loading",
});

/**
 * Motivo a mostrar si la lectura está bloqueada: `null` si puede leer y
 * mientras la sesión carga (bloqueada, pero sin afirmar que falta el permiso).
 */
export const financeReadBlockReason = (read: FinanceReadState, reason: string): string | null =>
  read.canRead || read.isSessionLoading ? null : reason;
