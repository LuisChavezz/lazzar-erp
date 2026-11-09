
"use client"

import { useSession } from "next-auth/react";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { getModuleEntryHref } from "@/src/utils/moduleEntry";
import type { PermissionContext } from "@/src/interfaces/permission-context.interface";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { homeCards } from "@/src/constants/homeCards";
import TiltCard from "./TiltCard";

/**
 * Destino de la tarjeta para `user`: el mismo que el resto de entradas al
 * módulo (`getModuleEntryHref`), así quien solo tiene una sección (p. ej.
 * `R-CRM-CLIENTES` sin `R-CRM`) entra por ella. Una tarjeta sin grupo en
 * `appRouteGroups` solo lleva a su `href` si puede abrirlo. `null` si no hay
 * ninguna abrible: la tarjeta no se muestra (visibilidad y destino salen de la
 * misma regla, EC-813).
 */
const cardHref = (card: (typeof homeCards)[number], user: PermissionContext | undefined) => {
  const group = appRouteGroups.find((item) => item.modulePath === card.href);
  if (group) return getModuleEntryHref(group, user);
  return canAccessRoute(card.href, user) ? card.href : null;
};

export const HomedGrid = () => {
  const { data: session, status } = useSession();
  const visibleHomeCards = homeCards.flatMap((card) => {
    const href = cardHref(card, session?.user);
    return href ? [{ ...card, href }] : [];
  });
  const skeletonCards = visibleHomeCards.length > 0 ? visibleHomeCards : homeCards;

  /**
   * Durante la carga de sesión, renderiza placeholders con las mismas dimensiones
   * que las TiltCards reales para reservar el espacio en la grilla.
   * Esto evita el salto de layout (CLS) cuando los permisos resuelven y las
   * tarjetas pasan de invisible a visible.
   */
  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto py-12">
        {skeletonCards.map((card) => (
          <div
            key={card.href}
            className={`${card.className} min-h-64`}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto py-12">
      {visibleHomeCards.map((card) => (
        <TiltCard
          key={card.href}
          icon={card.icon}
          title={card.title}
          description={card.description}
          footerText={card.footerText}
          href={card.href}
          accentClass={card.accentClass}
          accentBgClass={card.accentBgClass}
          shadowColorClassName={card.shadowColorClassName}
          className={`${card.className} min-h-64`}
        />
      ))}
    </div>
  );
};
