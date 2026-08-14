"use client";

import { AppearanceSection } from "./AppearanceSection";

/**
 * Pestaña "General": preferencias de la interfaz. Compone secciones
 * independientes para que añadir futuras opciones sea sumar un componente.
 */
export function GeneralPanel() {
  return (
    <div className="space-y-4">
      <AppearanceSection />
    </div>
  );
}
