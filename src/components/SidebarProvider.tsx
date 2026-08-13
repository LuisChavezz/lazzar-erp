"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSidebarStore } from "@/src/stores/sidebar.store";

// ─── Interfaz del contexto ────────────────────────────────────────────────────

interface SidebarContextType {
  /** Indica si el sidebar está anclado (expandido de forma permanente). */
  isPinned: boolean;
  /** Alterna entre estado anclado y no anclado. */
  togglePin: () => void;
}

// ─── Contexto con valores por defecto ─────────────────────────────────────────

const SidebarContext = createContext<SidebarContextType>({
  isPinned: false,
  togglePin: () => {},
});

// ─── Hook público para consumir el contexto ───────────────────────────────────

export const useSidebar = () => useContext(SidebarContext);

// ─── Proveedor ────────────────────────────────────────────────────────────────

export function SidebarProvider({ children }: { children: ReactNode }) {
  // El anclaje se persiste en localStorage (store de Zustand), así sobrevive a
  // recargas y a navegaciones con carga completa (cambio de sucursal, logout).
  const isPinned = useSidebarStore((state) => state.isPinned);
  const togglePin = useSidebarStore((state) => state.togglePin);

  // La rehidratación de Zustand con localStorage es síncrona, por lo que el
  // primer render del cliente ya trae el valor persistido y no coincidiría con
  // el HTML del servidor (siempre `false`). Se difiere un tick para evitar el
  // error de hidratación.
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => setHasMounted(true), []);

  return (
    <SidebarContext value={{ isPinned: hasMounted && isPinned, togglePin }}>
      {children}
    </SidebarContext>
  );
}
