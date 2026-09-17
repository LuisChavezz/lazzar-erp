"use client";

import { useState, useCallback } from "react";
import { EmailList } from "./EmailList";
import { EmailDetail } from "./EmailDetail";
import { EmailSidebar } from "./EmailSidebar";
import { useGoogleMessages } from "../../hooks/useGoogleMessages";
import {
  DEFAULT_FOLDER_ID,
  getFolderQuery,
  type GmailFolderId,
} from "../../constants/gmailFolders";
import type { GoogleEmailMessage } from "../../interfaces/google.interface";

/**
 * Altura de la bandeja: ocupa el alto disponible bajo el header/padding de
 * `(Main)/layout.tsx` para que SOLO el contenido interno (lista o detalle)
 * haga scroll, nunca la página completa. Offsets medidos contra ese layout:
 * mobile = header fijo (80px, `pt-20`) + `space-y-6` (24px) + `pb-6` (24px);
 * desktop = `Header` en flujo (80px) + `md:space-y-8` (32px) + `md:pb-12`
 * (48px). Si ese layout cambia esos valores, reajustar aquí también.
 */
const INBOX_HEIGHT_CLASS = "h-[calc(100dvh-128px)] md:h-[calc(100dvh-160px)] min-h-[420px]";

/**
 * Componente orquestador de la bandeja de entrada.
 *
 * Gestiona la transición deslizante entre la lista de correos y el detalle.
 * La animación opera únicamente sobre `transform` (sin reflow de layout).
 * La bandeja completa tiene altura fija (`INBOX_HEIGHT_CLASS`); lista y
 * detalle ocupan esa misma altura y scrollean su propio contenido por dentro.
 */
export const EmailInbox = () => {
  const [selectedFolder, setSelectedFolder] = useState<GmailFolderId>(DEFAULT_FOLDER_ID);
  /** Término de búsqueda confirmado. Vacío = filtro de carpeta activo. */
  const [searchQuery, setSearchQuery] = useState("");
  /** Query efectivo enviado a la API: búsqueda explícita o filtro de carpeta. */
  const activeQuery = searchQuery.trim() || getFolderQuery(selectedFolder);
  const hook = useGoogleMessages({ query: activeQuery });
  const [selectedMessage, setSelectedMessage] = useState<GoogleEmailMessage | null>(null);
  const isDetailVisible = selectedMessage !== null;

  const handleSelectMessage = useCallback((message: GoogleEmailMessage) => {
    setSelectedMessage(message);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedMessage(null);
  }, []);

  /** Al cambiar de carpeta: cierra el detalle, limpia la búsqueda y carga la nueva carpeta. */
  const handleFolderChange = useCallback((folderId: GmailFolderId) => {
    setSelectedFolder(folderId);
    setSelectedMessage(null);
    setSearchQuery("");
  }, []);

  return (
    <div
      className={`flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 shadow-soft overflow-hidden ${INBOX_HEIGHT_CLASS}`}
      aria-label="Bandeja de entrada"
    >
      {/* Barra lateral de carpetas */}
      <EmailSidebar
        selectedFolder={selectedFolder}
        onFolderChange={handleFolderChange}
        disabled={hook.isPending}
      />

      {/* Área principal — slider lista / detalle */}
      <div className="relative flex-1 h-full overflow-hidden border-l border-slate-200 dark:border-slate-700">
        {/*
         * Contenedor deslizante: ancho doble (200%), dos paneles de 50% cada uno.
         * La transición de `transform` desliza entre lista y detalle sin reflow.
         */}
        <div
          className="flex w-[200%] h-full transition-transform duration-300 ease-in-out"
          style={{ transform: isDetailVisible ? "translateX(-50%)" : "translateX(0%)" }}
          aria-live="polite"
        >
          {/* Panel izquierdo — Lista de correos (scroll interno) */}
          <div
            className="w-1/2 h-full flex flex-col"
            inert={isDetailVisible ? true : undefined}
          >
            <EmailList
              hook={hook}
              selectedMessageId={selectedMessage?.id ?? null}
              onSelectMessage={handleSelectMessage}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Panel derecho — Detalle (scroll interno propio) */}
          <div className="w-1/2 h-full" inert={!isDetailVisible ? true : undefined}>
            {selectedMessage ? (
              <EmailDetail message={selectedMessage} onBack={handleBack} />
            ) : (
              <div aria-hidden="true" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
