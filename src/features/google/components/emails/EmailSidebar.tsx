"use client";

import { GMAIL_FOLDERS, type GmailFolderId } from "../../constants/gmailFolders";

// --- Props ---

interface EmailSidebarProps {
  selectedFolder: GmailFolderId;
  onFolderChange: (id: GmailFolderId) => void;
  /** Deshabilita la selección durante la carga inicial. */
  disabled?: boolean;
}

// --- Componente ---

/**
 * Barra lateral de navegación entre carpetas de Gmail.
 *
 * Cada opción modifica el parámetro `q` enviado a la API de Gmail en
 * `useGoogleMessages`, permitiendo navegar entre Recibidos, Enviados,
 * Destacados, Borradores y No deseado.
 */
export const EmailSidebar = ({
  selectedFolder,
  onFolderChange,
  disabled = false,
}: EmailSidebarProps) => {
  return (
    <nav
      aria-label="Carpetas de correo"
      className="w-44 shrink-0 flex flex-col py-3 bg-slate-50/70 dark:bg-slate-900/60 border-r border-slate-200 dark:border-slate-700"
    >
      {/* Título de sección */}
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-4 mb-2 select-none">
        Carpetas
      </p>

      <ul role="list" className="flex flex-col gap-0.5 px-2">
        {GMAIL_FOLDERS.map((folder) => {
          const Icon = folder.icon;
          const isActive = selectedFolder === folder.id;

          return (
            <li key={folder.id}>
              <button
                type="button"
                onClick={() => onFolderChange(folder.id)}
                disabled={disabled}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                  isActive
                    ? "bg-brand-100/70 dark:bg-brand-700/25 text-brand-700 dark:text-brand-300"
                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/60 cursor-pointer",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "w-4 h-4 shrink-0 transition-colors duration-150",
                    isActive
                      ? "text-brand-500 dark:text-brand-400"
                      : "text-slate-400 dark:text-slate-500",
                  ].join(" ")}
                  aria-hidden="true"
                />
                <span className="truncate">{folder.label}</span>

                {/* Indicador visual de carpeta activa */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500 dark:bg-brand-400 shrink-0"
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
