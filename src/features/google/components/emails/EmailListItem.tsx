"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  parseSenderName,
  getSenderInitials,
  formatMessageDate,
  getAvatarColor,
} from "./email.utils";
import { googleGetEmailMessageById } from "../../services/actions";
import { googleMessageQueryKey } from "../../hooks/useGoogleMessage";
import type { GoogleEmailMessage } from "../../interfaces/google.interface";

// --- Props ---

interface EmailListItemProps {
  message: GoogleEmailMessage;
  isSelected: boolean;
  onSelect: (message: GoogleEmailMessage) => void;
  /** Cuando es true, desactiva el click y el prefetch del detalle (ej. durante refetch). */
  disabled?: boolean;
}

// --- Componente ---

/**
 * Fila individual de un correo en la bandeja de entrada.
 * Muestra avatar, remitente, asunto, snippet y fecha del mensaje.
 *
 * Al hacer hover sobre el ítem, lanza un prefetchQuery del detalle del mensaje.
 * Si los datos ya están en caché (staleTime no expirado), no realiza ninguna petición.
 * Esto permite que abrir el detalle sea instantáneo en la mayoría de los casos.
 */
export const EmailListItem = ({ message, isSelected, onSelect, disabled = false }: EmailListItemProps) => {
  const queryClient = useQueryClient();
  const senderName = parseSenderName(message.from_full || message.from);
  const initials = getSenderInitials(senderName);
  const avatarColor = getAvatarColor(senderName);
  const formattedDate = formatMessageDate(message.date);

  /**
   * Pre-carga el detalle del mensaje al pasar el cursor.
   * Comparte la misma queryKey y staleTime que `useGoogleMessage`,
   * por lo que el caché es reutilizado al abrir el detalle.
   * No hace nada si el ítem está deshabilitado (durante refetch).
   */
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    queryClient.prefetchQuery({
      queryKey: googleMessageQueryKey(message.id),
      queryFn: () => googleGetEmailMessageById(message.id),
      staleTime: 5 * 60 * 1000,
    });
  }, [queryClient, message.id, disabled]);

  return (
    <button
      type="button"
      onClick={() => { if (!disabled) onSelect(message); }}
      onMouseEnter={handleMouseEnter}
      disabled={disabled}
      aria-current={isSelected ? true : undefined}
      aria-label={`Correo de ${senderName}: ${message.subject}`}
      className={[
        "w-full text-left px-4 py-3 flex items-start gap-3",
        "border-b border-slate-100 dark:border-slate-800",
        "transition-colors duration-150 cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-inset",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        isSelected
          ? "bg-brand-50 dark:bg-brand-700/20"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/60",
      ].join(" ")}
    >
      {/* Avatar con iniciales */}
      <span
        aria-hidden="true"
        className={`shrink-0 w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold select-none`}
      >
        {initials}
      </span>

      {/* Contenido */}
      <span className="flex-1 min-w-0">
        <span className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
            {senderName}
          </span>
          <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {formattedDate}
          </span>
        </span>

        <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 truncate mb-0.5">
          {message.subject || "(Sin asunto)"}
        </span>

        <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">
          {message.snippet}
        </span>
      </span>
    </button>
  );
};

