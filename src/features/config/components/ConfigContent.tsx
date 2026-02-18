"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ConfigCard } from "./ConfigCard";
import { ConfigDetailView } from "./ConfigDetailView";
import { configCards } from "../constants/configCardItems";


export function ConfigContent() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  const queryClient = useQueryClient();
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);

  // Manejar clic en tarjeta para mostrar vista detallada
  const handleCardClick = (view: string) => {
    setSelectedView(view);
    // Esperar a que termine la animación de salida (500ms) antes de ocultar el grid
    setTimeout(() => setIsGridVisible(false), 500);
  };

  // Manejar clic en botón "Atrás" para volver al grid
  const handleBack = () => {
    setIsGridVisible(true);
    // Pequeño retraso para permitir que el grid sea visible antes de iniciar la animación de entrada
    requestAnimationFrame(() => {
      setSelectedView(null);
    });
  };

  // Validar si la tarjeta es visible para el usuario actual
  const visibleCards = configCards.filter((card) => ( (card.adminOnly) ? isAdmin : true) );

  return (
    <>
      <div className="w-full grid grid-cols-1">
        {/* Grid View */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCards.map((card) => (
              <ConfigCard
                key={card.view}
                title={card.title}
                description={card.description}
                icon={card.icon}
                onClick={() => handleCardClick(card.view)}
                onMouseEnter={
                  card.prefetchKey && card.prefetchFn
                    ? () => {
                        queryClient.prefetchQuery({
                          queryKey: card.prefetchKey!,
                          queryFn: card.prefetchFn,
                        });
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        {/* Detail View */}
        <ConfigDetailView selectedView={selectedView} onBack={handleBack} />
      </div>
    </>
  );
}
