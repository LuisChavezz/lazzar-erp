"use client";

import { useState, useRef } from "react";
import { EmailListItem } from "./EmailListItem";
import { EmailListSkeleton } from "./EmailListSkeleton";
import { EmailEmptyState } from "./EmailEmptyState";
import { ComposeEmailForm } from "./ComposeEmailForm";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  RefreshIcon,
  SearchIcon,
  XIcon,
} from "@/src/components/Icons";
import type { GoogleEmailMessage } from "../../interfaces/google.interface";
import type { useGoogleMessagesReturn } from "../../hooks/useGoogleMessages";

// --- Props ---

interface EmailListProps {
  hook: useGoogleMessagesReturn;
  selectedMessageId: string | null;
  onSelectMessage: (message: GoogleEmailMessage) => void;
  /** Término de búsqueda comprometido (estado en EmailInbox). */
  searchQuery: string;
  /** Callback para notificar un nuevo término de búsqueda al padre. */
  onSearchChange: (value: string) => void;
}

// --- Componente ---

/**
 * Lista de correos con barra de búsqueda, paginación y controles de cabecera.
 *
 * La búsqueda es "lazy": el usuario escribe en el input local (`inputValue`) y
 * confirma pulsando Enter o el botón de búsqueda. Solo entonces se notifica al
 * padre (`onSearchChange`), que actualiza el parámetro `q` de la API de Gmail.
 */
export const EmailList = ({
  hook,
  selectedMessageId,
  onSelectMessage,
  searchQuery,
  onSearchChange,
}: EmailListProps) => {
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  /**
   * `prevSearchQuery` aplica el patrón React "Storing previous props":
   * detecta cuando el padre vacía `searchQuery` (cambio de carpeta) durante el
   * render y sincroniza `inputValue` sin useEffect.
   */
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);
  const [inputValue, setInputValue] = useState(searchQuery);

  if (prevSearchQuery !== searchQuery) {
    setPrevSearchQuery(searchQuery);
    // Solo limpia el input cuando el padre cancela la búsqueda.
    if (!searchQuery) setInputValue("");
  }

  const inputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    isPending,
    isFetching,
    hasNextPage,
    hasPreviousPage,
    currentPage,
    refetch,
    goToNextPage,
    goToPreviousPage,
  } = hook;

  /** Confirma la búsqueda y notifica al padre. */
  const handleSubmitSearch = () => {
    onSearchChange(inputValue.trim());
  };

  /** Limpia el input y cancela la búsqueda activa. */
  const handleClearSearch = () => {
    setInputValue("");
    onSearchChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmitSearch();
    if (e.key === "Escape") handleClearSearch();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Diálogo de redacción — gestionado desde la lista */}
      <ComposeEmailForm open={isComposeOpen} onOpenChange={setIsComposeOpen} />

      {/* Cabecera principal */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {searchQuery ? "Resultados" : "Correos"}
        </h2>

        <div className="flex items-center gap-2">
          {/* Indicador de página */}
          {!isPending && messages.length > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              Pág. {currentPage}
            </span>
          )}

          {/* Botón de redactar nuevo correo */}
          <button
            type="button"
            onClick={() => setIsComposeOpen(true)}
            disabled={isFetching}
            aria-label="Redactar nuevo correo"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {/* Botón de actualizar — fuerza re-fetch de la página actual */}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Actualizar correos"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <RefreshIcon
              className={`w-3.5 h-3.5 transition-transform duration-500 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {/* Input con ícono decorativo y botón de limpiar integrado */}
        <div className="relative flex-1">
          <SearchIcon
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar correos…"
            aria-label="Buscar correos"
            className={[
              "w-full pl-8 pr-8 py-1.5 text-xs rounded-lg",
              "border border-slate-200 dark:border-slate-700",
              "bg-slate-50 dark:bg-slate-800/80",
              "text-slate-800 dark:text-slate-200",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
              // Oculta el botón × nativo del tipo "search"
              "[&::-webkit-search-cancel-button]:appearance-none",
            ].join(" ")}
          />
          {/* Botón limpiar — aparece solo cuando hay texto en el input */}
          {inputValue && (
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-4 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <XIcon className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Botón de ejecutar búsqueda — mismo diseño que + y ↺, aparece al escribir */}
        {inputValue && (
          <button
            type="button"
            onClick={handleSubmitSearch}
            disabled={isFetching}
            aria-label="Ejecutar búsqueda"
            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <SearchIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Chip de búsqueda activa — visible cuando hay un query comprometido */}
      {searchQuery && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-700/30">
          <SearchIcon
            className="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0"
            aria-hidden="true"
          />
          <span className="text-xs text-slate-700 dark:text-slate-300 truncate flex-1">
            Resultados para: <strong>{searchQuery}</strong>
          </span>
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Cancelar búsqueda"
            className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-150 cursor-pointer focus-visible:outline-none"
          >
            <XIcon className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Cuerpo — skeletons o lista (atenuado durante cambio de página con keepPreviousData) */}
      <div
        className={`flex-1 overflow-y-auto transition-opacity duration-200 ${
          isFetching && !isPending ? "opacity-60" : "opacity-100"
        }`}
      >
        {isPending ? (
          <EmailListSkeleton />
        ) : messages.length === 0 ? (
          <EmailEmptyState />
        ) : (
          <ul role="list" aria-label="Correos de la bandeja de entrada">
            {messages.map((message) => (
              <li key={message.id} role="listitem">
                <EmailListItem
                  message={message}
                  isSelected={selectedMessageId === message.id}
                  onSelect={onSelectMessage}
                  disabled={isFetching}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Paginación */}
      {!isPending && messages.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          aria-label="Controles de paginación"
        >
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={!hasPreviousPage}
            aria-label="Página anterior"
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "transition-colors duration-150",
              hasPreviousPage
                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
            ].join(" ")}
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
            Anterior
          </button>

          <button
            type="button"
            onClick={goToNextPage}
            disabled={!hasNextPage}
            aria-label="Página siguiente"
            className={[
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
              "transition-colors duration-150",
              hasNextPage
                ? "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                : "text-slate-300 dark:text-slate-600 cursor-not-allowed",
            ].join(" ")}
          >
            Siguiente
            <ChevronRightIcon className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
};
