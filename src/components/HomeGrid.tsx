
"use client"

import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { homeCards } from "@/src/constants/homeCards";
import TiltCard from "./TiltCard";

export const HomedGrid = () => {
  const { data: session, status } = useSession();

  /**
   * Durante la carga de sesión, renderiza placeholders con las mismas dimensiones
   * que las TiltCards reales para reservar el espacio en la grilla.
   * Esto evita el salto de layout (CLS) cuando los permisos resuelven y las
   * tarjetas pasan de invisible a visible.
   */
  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto py-12">
        {homeCards.map((card) => (
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
      {homeCards.map((card) => (
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
          className={card.className}
          isVisible={hasPermission(card.permission, session?.user)}
        />
      ))}
    </div>
  );
};
