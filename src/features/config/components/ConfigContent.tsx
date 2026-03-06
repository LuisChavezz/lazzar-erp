"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ConfigCard } from "./ConfigCard";
import { ConfigDetailView } from "./ConfigDetailView";
import { ArrowLeftIcon, ChevronRightIcon, CloseIcon, SearchIcon } from "@/src/components/Icons";
import TiltCard from "@/src/components/TiltCard";
import { useConfigMenu } from "../hooks/useConfigMenu";

export function ConfigContent() {
  const { data: session } = useSession();

  // Obtener el cliente de consulta para hacer prefetch de datos
  const queryClient = useQueryClient();

  // Estados para controlar la visibilidad del grid y la búsqueda
  const {
    selectedView,
    isGridVisible,
    selectedGroup,
    searchTerm,
    setSearchTerm,
    handleCardClick,
    handleBack,
    handleGroupClick,
    handleGroupBack,
    availableGroups,
    filteredCards,
    selectedGroupCards,
  } = useConfigMenu(session?.user);

  const groupTopRef = useRef<HTMLDivElement | null>(null);
  const hasSearch = searchTerm.trim().length > 0;

  // Scroll al grupo seleccionado cuando cambia
  useEffect(() => {
    if (!selectedGroup) return;
    const scrollToTop = () => {
      groupTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    const frame = window.requestAnimationFrame(scrollToTop);
    return () => window.cancelAnimationFrame(frame);
  }, [selectedGroup]);

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
          {!selectedGroup ? (
            <div className="w-full transition-all duration-500 ease-in-out">
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
                  {hasSearch && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <CloseIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {hasSearch ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                  {availableGroups.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <TiltCard
                        key={group.group}
                        onClick={() => handleGroupClick(group.group)}
                        shadowColorClassName={group.accentShadowClass}
                        className="cursor-pointer rounded-2xl bg-white dark:bg-black border border-slate-200 dark:border-white/10 p-6 sm:p-8 h-full group"
                      >
                        <div className="flex flex-col h-full">
                          <div
                            className={`mb-6 w-14 h-14 rounded-full ${group.accentBgClass} flex items-center justify-center ${group.accentClass}`}
                          >
                            <GroupIcon className="w-7 h-7" />
                          </div>
                          <div>
                            <h3 className="text-xl font-medium text-slate-800 dark:text-slate-100 mb-2 font-display">
                              {group.title}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                              {group.description}
                            </p>
                          </div>
                          <div
                            className={`mt-auto pt-8 flex items-center ${group.accentClass} text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0`}
                          >
                            <span>{group.actionLabel}</span>
                            <ChevronRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </TiltCard>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full transition-all duration-500 ease-in-out" ref={groupTopRef}>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGroupBack}
                      className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-sky-500 transition-colors px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                      <span className="text-sm font-medium">Volver al menú</span>
                    </button>
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedGroup}
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {selectedGroupCards.map((card) => (
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
            </div>
          )}
        </div>

        {/* Detail View */}
        <ConfigDetailView selectedView={selectedView} onBack={handleBack} />
      </div>
    </>
  );
}
