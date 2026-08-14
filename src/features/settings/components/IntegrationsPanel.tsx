"use client";

import { GoogleAccountCard } from "@/src/features/google/components/GoogleAccountCard";

/**
 * Pestaña "Integraciones": cuentas externas enlazadas al usuario.
 *
 * `GoogleAccountCard` aporta su propia tarjeta (borde, fondo y estados), por lo
 * que aquí solo se apila sin envoltorio adicional. El flujo de conexión de
 * Google redirige la ventana completa: el modal no sobrevive al round-trip y el
 * usuario vuelve a la página en la que estaba (UX aceptada).
 */
export function IntegrationsPanel() {
  return (
    <div className="space-y-4">
      <GoogleAccountCard />
    </div>
  );
}
