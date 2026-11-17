
"use client"

import { useSession } from "next-auth/react";
import { useSessionRecovery } from "@/src/features/auth/components/SessionRecoveryProvider";
import { homeCards } from "@/src/constants/homeCards";
import { getHomeCardHref } from "@/src/utils/homeCardHref";
import TiltCard from "./TiltCard";

export const HomedGrid = () => {
  const { data: session, status } = useSession();
  const { phase: recoveryPhase } = useSessionRecovery();
  const visibleHomeCards = homeCards.flatMap((card) => {
    const href = getHomeCardHref(card, session?.user);
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

  // Sin ningún módulo abrible: se explica en lugar de dejar el Home en blanco.
  // Solo con la sesión leída: si se está recuperando o falló, la falta de
  // tarjetas no dice nada de sus permisos (el sidebar ya avisa con "Reintentar").
  if (visibleHomeCards.length === 0 && session?.user && recoveryPhase === "idle") {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-white/5 px-6 py-8 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            No tienes módulos asignados
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Contacta a tu administrador para que te asigne los permisos que necesitas.
          </p>
        </div>
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
