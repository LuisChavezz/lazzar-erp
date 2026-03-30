
"use client"

import { useSession } from "next-auth/react";
import { hasPermission } from "@/src/utils/permissions";
import { homeCards } from "@/src/constants/homeCards";
import TiltCard from "./TiltCard";

export const HomedGrid = () => {
  const { data: session } = useSession();

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
