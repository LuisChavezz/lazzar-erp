"use client";

import { useState } from "react";
import { OrderMenuCard } from "./OrderMenuCard";
import { OrderMenuDetailView } from "./OrderMenuDetailView";
import { orderMenuCards } from "../constants/orderCardItems";

export function OrderMenuContent() {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);

  const handleCardClick = (view: string) => {
    setSelectedView(view);
    setTimeout(() => setIsGridVisible(false), 500);
  };

  const handleNavigate = (view: string) => {
    setSelectedView(view);
    setIsGridVisible(false);
  };

  const handleBack = () => {
    setIsGridVisible(true);
    requestAnimationFrame(() => {
      setSelectedView(null);
    });
  };

  return (
    <div className="w-full grid grid-cols-1">
      <div
        className={`
          col-start-1 row-start-1 w-full transition-all duration-500 ease-in-out
          ${selectedView
            ? "opacity-0 -translate-y-20 pointer-events-none scale-95"
            : "opacity-100 translate-y-0 scale-100"
          }
          ${!isGridVisible ? "hidden" : ""}
        `}
      >
        <div className="w-full transition-all duration-500 ease-in-out">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {orderMenuCards.map((card) => (
              <OrderMenuCard
                key={card.view}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => handleCardClick(card.view)}
                accentClass={card.accentClass}
                accentBgClass={card.accentBgClass}
                accentShadowClass={card.accentShadowClass}
              />
            ))}
          </div>
        </div>
      </div>

      <OrderMenuDetailView
        selectedView={selectedView}
        onBack={handleBack}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
