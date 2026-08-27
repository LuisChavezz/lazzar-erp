
"use client"

import { useSession } from "next-auth/react";
import { hasAnyPermission } from "@/src/utils/permissions";
import { appRouteGroups, getGroupAccessPermissions } from "@/src/constants/appRoutes";
import { homeCards } from "@/src/constants/homeCards";
import TiltCard from "./TiltCard";

/**
 * Permisos que hacen visible la tarjeta de un módulo: el del propio módulo más
 * el de cada una de sus secciones. Sin esto, quien tuviera solo una sección
 * (p. ej. `R-CRM-CLIENTES` sin `R-CRM`) vería el Home vacío y no tendría por
 * dónde entrar. `card.permission` es el respaldo si la tarjeta no corresponde a
 * ningún grupo de `appRouteGroups`.
 */
const cardAccessPermissions = (card: (typeof homeCards)[number]): string[] => {
  const group = appRouteGroups.find((item) => item.modulePath === card.href);
  return group ? getGroupAccessPermissions(group) : [card.permission];
};

export const HomedGrid = () => {
  const { data: session, status } = useSession();
  const visibleHomeCards = homeCards.filter((card) =>
    hasAnyPermission(cardAccessPermissions(card), session?.user)
  );
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
