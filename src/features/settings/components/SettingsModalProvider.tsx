"use client";

import { useState } from "react";
import {
  SettingsModalContext,
  type SettingsModalContextValue,
  type SettingsTab,
} from "../hooks/useSettingsModal";
import { SettingsModal } from "./SettingsModal";

/**
 * Provee el estado del modal de configuración a toda la app y monta el propio
 * modal. Se coloca una única vez en el layout de (Main), envolviendo los puntos
 * de entrada (menú de usuario, opción de Google) para que puedan abrirlo.
 */
export function SettingsModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const value: SettingsModalContextValue = {
    isOpen,
    activeTab,
    open: (tab: SettingsTab = "general") => {
      setActiveTab(tab);
      setIsOpen(true);
    },
    close: () => setIsOpen(false),
    setActiveTab,
  };

  return (
    <SettingsModalContext.Provider value={value}>
      {children}
      <SettingsModal />
    </SettingsModalContext.Provider>
  );
}
