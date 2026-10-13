import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { canAccessRoute } from "@/src/utils/routeAccess";

/** Ruta de edición de una cotización (`/sales/quotes/[id]/edit`). */
export const quoteEditPath = (quoteId: number) => `/sales/quotes/${quoteId}/edit`;

/**
 * Código que exige el guard de la página (`quoteEditAccess.server`, que no se
 * puede importar desde el cliente: por eso el código se repite aquí).
 */
const EDIT_QUOTE_PERMISSION = "E-CRM-COTIZACIONES";

/**
 * ¿El proxy dejaría entrar a `user` en la ruta de edición de cotizaciones? Se
 * resuelve con la MISMA búsqueda que `src/proxy.ts` (`canAccessRoute`), así que
 * sigue al mapa de `routePermissions` (hoy "/sales/quotes" →
 * R-CRM-COTIZACIONES). El id es un ejemplo: la regla no depende de él.
 */
export const canAccessQuoteEditRoute = (user?: PermissionContext | null): boolean =>
  canAccessRoute(quoteEditPath(0), user);

/**
 * ¿`user` puede ATERRIZAR en la edición de una cotización? Exige exactamente lo
 * que exige esa ruta: la regla del proxy y el guard de la página.
 *
 * Es la condición para ofrecer una acción que CREA una cotización y navega a
 * editarla (Recompra desde un pedido, Cotizar desde una oportunidad): sin ella
 * el usuario la crearía y rebotaría después, dejándola huérfana. No se pide
 * `C-CRM-COTIZACIONES`: ningún rol lo tiene (tampoco "Ventas").
 */
export const canLandOnQuoteEdit = (user?: PermissionContext | null): boolean =>
  canAccessQuoteEditRoute(user) && hasPermission(EDIT_QUOTE_PERMISSION, user);
