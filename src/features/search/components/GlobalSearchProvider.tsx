"use client";

import { useState } from "react";
import {
  GlobalSearchModalContext,
  type GlobalSearchModalContextValue,
} from "../hooks/useGlobalSearchModal";
import { GlobalSearchPalette } from "./GlobalSearchPalette";

/**
 * Provee el estado de la paleta de búsqueda global a toda la app y monta la
 * propia paleta. Se coloca una única vez en el layout de (Main), envolviendo el
 * header (su punto de entrada) y el contenido de las páginas.
 *
 * La paleta se abre ÚNICAMENTE desde el botón de búsqueda del header: no hay
 * atajo de teclado. El teclado que sí sigue vivo es el de dentro de la paleta
 * —flechas, Enter y Escape—, que gestiona ella misma.
 */
export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value: GlobalSearchModalContextValue = {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };

  return (
    <GlobalSearchModalContext.Provider value={value}>
      {children}
      <GlobalSearchPalette />
    </GlobalSearchModalContext.Provider>
  );
}
