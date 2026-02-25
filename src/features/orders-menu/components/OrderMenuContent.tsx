"use client";

import { useState } from "react";
import { CloseIcon, SearchIcon } from "@/src/components/Icons";
import { OrderMenuCard } from "./OrderMenuCard";
import { OrderMenuDetailView } from "./OrderMenuDetailView";
import { orderMenuCards } from "../constants/orderCardItems";

export function OrderMenuContent() {
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCardClick = (view: string) => {
    setSelectedView(view);
    setTimeout(() => setIsGridVisible(false), 500);
  };

  const handleBack = () => {
    setIsGridVisible(true);
    requestAnimationFrame(() => {
      setSelectedView(null);
    });
  };

  const normalizedQuery = searchTerm.trim().toLowerCase();
  const filteredCards = normalizedQuery
    ? orderMenuCards.filter((card) => {
        const titleMatch = card.title.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = card.description?.toLowerCase().includes(normalizedQuery);
        return titleMatch || descriptionMatch;
      })
    : orderMenuCards;

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
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <SearchIcon className="h-5 w-5" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 sm:text-sm transition-shadow"
              placeholder="Buscar órdenes..."
            />
            {searchTerm.length > 0 && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label="Limpiar búsqueda"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCards.map((card) => (
            <OrderMenuCard
              key={card.view}
              title={card.title}
              description={card.description}
              icon={card.icon}
              onClick={() => handleCardClick(card.view)}
            />
          ))}
        </div>
      </div>

      <OrderMenuDetailView selectedView={selectedView} onBack={handleBack} />
    </div>
  );
}
