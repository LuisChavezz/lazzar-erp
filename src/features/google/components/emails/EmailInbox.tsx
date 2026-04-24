"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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

/** Altura fija del panel de lista de correos (px). */
const LIST_PANEL_HEIGHT = 580;

/**
 * Componente orquestador de la bandeja de entrada.
 *
 * Gestiona la transición deslizante entre la lista de correos y el detalle.
 * La animación opera únicamente sobre `transform` (sin reflow de layout).
 *
 * La altura del contenedor se adapta dinámicamente al panel activo mediante
 * un ResizeObserver, transitando de la altura fija de la lista a la altura
 * natural del detalle y viceversa.
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

  const containerRef = useRef<HTMLDivElement>(null);
  const listPanelRef = useRef<HTMLDivElement>(null);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  /**
   * Sincroniza la altura del contenedor con el panel activo.
   * El ResizeObserver reacciona a cambios de contenido (carga de mensajes,
   * redimensionado de ventana, etc.) sin intervención adicional.
   */
  useEffect(() => {
    const container = containerRef.current;
    const activeEl = isDetailVisible ? detailPanelRef.current : listPanelRef.current;
    if (!container || !activeEl) return;

    const syncHeight = () => {
      container.style.height = `${activeEl.scrollHeight}px`;
    };

    const observer = new ResizeObserver(syncHeight);
    observer.observe(activeEl);
    syncHeight();

    return () => observer.disconnect();
  }, [isDetailVisible]);

  const handleSelectMessage = useCallback((message: GoogleEmailMessage) => {
    setSelectedMessage(message);
    requestAnimationFrame(() => {
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
      className="flex w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-soft overflow-hidden"
      aria-label="Bandeja de entrada"
    >
      {/* Barra lateral de carpetas */}
      <EmailSidebar
        selectedFolder={selectedFolder}
        onFolderChange={handleFolderChange}
        disabled={hook.isPending}
      />

      {/* Área principal — slider lista / detalle */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden border-l border-slate-200 dark:border-slate-700"
        style={{
          height: LIST_PANEL_HEIGHT,
          transition: "height 250ms ease-in-out",
        }}
      >
        {/*
         * Contenedor deslizante: ancho doble (200%), dos paneles de 50% cada uno.
         * La transición de `transform` desliza entre lista y detalle sin reflow.
         */}
        <div
          className="flex w-[200%] transition-transform duration-300 ease-in-out"
          style={{ transform: isDetailVisible ? "translateX(-50%)" : "translateX(0%)" }}
          aria-live="polite"
        >
          {/* Panel izquierdo — Lista de correos (altura fija, scroll interno) */}
          <div
            ref={listPanelRef}
            className="w-1/2 flex flex-col"
            style={{ height: LIST_PANEL_HEIGHT }}
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

          {/* Panel derecho — Detalle (altura natural, se ajusta al contenido) */}
          <div
            ref={detailPanelRef}
            className="w-1/2"
            inert={!isDetailVisible ? true : undefined}
          >
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
