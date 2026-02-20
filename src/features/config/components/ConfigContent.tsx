"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ConfigCard } from "./ConfigCard";
import { ConfigDetailView } from "./ConfigDetailView";
import { configCards } from "../constants/configCardItems";
import { CloseIcon, SearchIcon } from "@/src/components/Icons";


export function ConfigContent() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const permissions = session?.user?.permissions ?? [];
  const canReadConfig = isAdmin || permissions.includes("R-CONF");

  // Obtener el cliente de consulta para hacer prefetch de datos
  const queryClient = useQueryClient();

  // Estados para controlar la visibilidad del grid y la búsqueda
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  const visibleCards = configCards.filter((card) => (card.adminOnly ? canReadConfig : true)); // Validar si la tarjeta es visible para el usuario actual
  const normalizedQuery = searchTerm.trim().toLowerCase(); // Normalizar el término de búsqueda para comparación insensible a mayúsculas y minúsculas
  const filteredCards = normalizedQuery
    ? visibleCards.filter((card) => { // Filtrar tarjetas basadas en el término de búsqueda
        const titleMatch = card.title.toLowerCase().includes(normalizedQuery);
        const descriptionMatch = card.description?.toLowerCase().includes(normalizedQuery);
        return titleMatch || descriptionMatch;
      })
    : visibleCards; // Si no hay término de búsqueda, mostrar todas las tarjetas visibles

  return (
    <>
      {!canReadConfig ? (
        <div className="w-full flex flex-col items-center justify-center py-16 px-6 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-dashed">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <CloseIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Acceso restringido
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-sm">
            No tienes permisos suficientes para ver la configuración.
          </p>
        </div>
      ) : (
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
          {/* Search Bar */}
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
                placeholder="Buscar configuración..."
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

          {/* Config Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
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
      )}
    </>
  );
}
