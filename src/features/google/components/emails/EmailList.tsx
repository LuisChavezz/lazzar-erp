"use client";

import { useState } from "react";
import { EmailListItem } from "./EmailListItem";
import { EmailListSkeleton } from "./EmailListSkeleton";
import { EmailEmptyState } from "./EmailEmptyState";
import { ComposeEmailForm } from "./ComposeEmailForm";
import { ChevronLeftIcon, ChevronRightIcon, EmailIcon, PlusIcon, RefreshIcon } from "@/src/components/Icons";
import type { GoogleEmailMessage } from "../../interfaces/google.interface";
import type { useGoogleMessagesReturn } from "../../hooks/useGoogleMessages";

// --- Props ---

interface EmailListProps {
  hook: useGoogleMessagesReturn;
  selectedMessageId: string | null;
  onSelectMessage: (message: GoogleEmailMessage) => void;
}

// --- Componente ---

/**
 * Lista de correos de la bandeja de entrada.
 * Muestra skeletons mientras carga, el listado de mensajes, y controles de paginación.
 * Solicita la primera página al montarse.
 */
export const EmailList = ({ hook, selectedMessageId, onSelectMessage }: EmailListProps) => {
  const [
    isComposeOpen,
    setIsComposeOpen,
  ] = useState(false);

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

  return (
    <div className="flex flex-col h-full">
      {/* Diálogo de redacción — gestionado desde la lista */}
      <ComposeEmailForm
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
      />

      {/* Cabecera de la lista */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <EmailIcon className="w-4 h-4 text-brand-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Bandeja de entrada
          </h2>
        </div>

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

      {/* Cuerpo — skeletons o lista (atenuado durante cambio de página con keepPreviousData) */}
      <div className={`flex-1 overflow-y-auto transition-opacity duration-200 ${isFetching && !isPending ? "opacity-60" : "opacity-100"}`}>
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


