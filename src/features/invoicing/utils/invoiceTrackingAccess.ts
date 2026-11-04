import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { findRoutePermissionRule } from "@/src/utils/routeAccess";
import { getFinanceReadState, type FinanceReadState, type SessionStatus } from "@/src/utils/financeRead";

/** Listados donde viven los detalles que la hoja "Seguimiento" abre en diálogo. */
export const ACCOUNTS_RECEIVABLE_PATH = "/finance/accounts-receivable";
export const CREDIT_NOTES_PATH = "/finance/credit-notes";

/**
 * ¿Puede ESTE usuario abrir el detalle que vive en `pathname`, y la sesión aún
 * carga? Única fuente de la hoja "Seguimiento" para las lecturas de otra
 * sección (EC-734): el requisito es el MISMO que la regla de esa ruta en
 * `routePermissions` (su subcódigo o `R-CONTABILIDAD`), así que sigue a la regla
 * si cambia. Una ruta sin regla solo exige sesión.
 */
export const getTrackingReadState = (
  user: PermissionContext | null | undefined,
  status: SessionStatus,
  pathname: string,
): FinanceReadState => {
  const rule = findRoutePermissionRule(pathname);
  return rule
    ? getFinanceReadState(user, status, rule.permission)
    : { canRead: status === "authenticated", isSessionLoading: status === "loading" };
};
