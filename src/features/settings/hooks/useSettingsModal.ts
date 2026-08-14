"use client";

import { createContext, useContext } from "react";

export type SettingsTab = "general" | "integrations";

export interface SettingsModalContextValue {
  isOpen: boolean;
  activeTab: SettingsTab;
  /** Abre el modal de configuración en la pestaña indicada (por defecto "general"). */
  open: (tab?: SettingsTab) => void;
  /** Cierra el modal de configuración. */
  close: () => void;
  /** Cambia la pestaña activa sin abrir/cerrar el modal. */
  setActiveTab: (tab: SettingsTab) => void;
}

export const SettingsModalContext = createContext<SettingsModalContextValue | null>(null);

/**
 * Acceso al estado del modal de configuración desde cualquier componente
 * cliente dentro de <SettingsModalProvider>. Permite abrir el modal
 * (opcionalmente en una pestaña concreta) desde menús u otros puntos de entrada.
 */
export function useSettingsModal(): SettingsModalContextValue {
  const context = useContext(SettingsModalContext);
  if (!context) {
    throw new Error("useSettingsModal debe usarse dentro de <SettingsModalProvider>");
  }
  return context;
}
