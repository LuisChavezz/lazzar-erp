import { appRouteGroups } from "../constants/appRoutes";
import { homeCards } from "../constants/homeCards";
import type { PermissionContext } from "../interfaces/permission-context.interface";
import { getModuleEntryHref } from "./moduleEntry";
import { canAccessRoute } from "./routeAccess";

type HomeCard = (typeof homeCards)[number];

/**
 * Destino de una tarjeta de Home para `user`: el mismo que el resto de entradas
 * al módulo (`getModuleEntryHref`), así quien solo tiene una sección (p. ej.
 * `R-CRM-CLIENTES` sin `R-CRM`) entra por ella. Una tarjeta sin grupo en
 * `appRouteGroups` solo lleva a su `href` si puede abrirlo. `null` si no hay
 * ninguna abrible: la tarjeta no se muestra (visibilidad y destino salen de la
 * misma regla, EC-813).
 */
export const getHomeCardHref = (card: HomeCard, user: PermissionContext | null | undefined): string | null => {
  const group = appRouteGroups.find((item) => item.modulePath === card.href);
  if (group) return getModuleEntryHref(group, user);
  return canAccessRoute(card.href, user) ? card.href : null;
};

/**
 * Primera tarjeta de Home que `user` puede abrir, en el orden de Home, con su
 * destino: la salida que ofrece la página "sin acceso" (EC-895), así la
 * sugerencia coincide con la primera tarjeta que el usuario ve en Home. `null`
 * si no ve ninguna.
 */
export const getFirstHomeCardEntry = (
  user: PermissionContext | null | undefined,
): { title: string; href: string } | null => {
  for (const card of homeCards) {
    const href = getHomeCardHref(card, user);
    if (href) return { title: card.title, href };
  }
  return null;
};
