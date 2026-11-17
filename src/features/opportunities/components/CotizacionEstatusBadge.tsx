import { StatusBadge, type StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { cotizacionEstatusBadge } from "../utils/cotizacionEstatus";

/**
 * Sin mapa propio: `cotizacionEstatusBadge` ya da la entrada completa de
 * cualquier estatus (conocido o de respaldo), así que va como `defaultConfig`
 * sobre un `config` vacío, como el estatus de "Mis pedidos".
 */
const NO_BADGE_CONFIG: Record<string, StatusBadgeConfigEntry> = {};

/**
 * Badge del estatus de una cotización (punto + etiqueta, `StatusBadge`), con el
 * nombre y los colores del tablero de cotizaciones. Única definición para la
 * tabla de cotizaciones de la oportunidad y el selector de "Ligar".
 */
export function CotizacionEstatusBadge({ cotizacion }: { cotizacion: OpportunityCotizacion }) {
  return (
    <StatusBadge
      status={String(cotizacion.estatus)}
      config={NO_BADGE_CONFIG}
      defaultConfig={cotizacionEstatusBadge(cotizacion)}
    />
  );
}
