"use client";

import { createContext, useContext } from "react";

export interface GlobalSearchModalContextValue {
  isOpen: boolean;
  /** Abre la paleta de búsqueda. */
  open: () => void;
  /** Cierra la paleta de búsqueda. */
  close: () => void;
}

export const GlobalSearchModalContext =
  createContext<GlobalSearchModalContextValue | null>(null);

/**
 * Acceso al estado de la paleta de búsqueda desde cualquier componente cliente
 * dentro de `<GlobalSearchProvider>`. Mismo patrón que `useSettingsModal`: el
 * provider vive una sola vez en el layout de (Main) y monta la paleta, así que
 * cualquier punto de entrada —hoy la barra del header— solo necesita `open()`.
 */
export function useGlobalSearchModal(): GlobalSearchModalContextValue {
  const context = useContext(GlobalSearchModalContext);
  if (!context) {
    throw new Error(
      "useGlobalSearchModal debe usarse dentro de <GlobalSearchProvider>",
    );
  }
  return context;
}
