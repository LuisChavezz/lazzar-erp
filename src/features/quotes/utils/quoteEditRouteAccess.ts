import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { hasPermission } from "@/src/utils/permissions";
import { canAccessRoute } from "@/src/utils/routeAccess";

/** Ruta de edición de una cotización (`/sales/quotes/[id]/edit`). */
export const quoteEditPath = (quoteId: number) => `/sales/quotes/${quoteId}/edit`;

/**
 * Código de edición de cotizaciones del catálogo de la tabla `permisos`: el que
 * exige el guard de la página. ÚNICA definición: `quoteEditAccess.server` lo
 * importa de aquí (este módulo sirve en cliente y en servidor; al revés no se
 * puede), así que el guard y `canLandOnQuoteEdit` no pueden discrepar.
 */
export const EDIT_QUOTE_PERMISSION = "E-CRM-COTIZACIONES";

/**
 * ¿El proxy dejaría entrar a `user` en la ruta de edición de cotizaciones? Se
 * resuelve con la MISMA búsqueda que `src/proxy.ts` (`canAccessRoute`), así que
 * sigue al mapa de `routePermissions` (hoy "/sales/quotes" →
 * R-CRM-COTIZACIONES). El id es un ejemplo: la regla no depende de él.
 */
const canAccessQuoteEditRoute = (user?: PermissionContext | null): boolean =>
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
