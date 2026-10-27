import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";
import { cotizacionEstatusBadge } from "../utils/cotizacionEstatus";

/**
 * Píldora del estatus de una cotización, con el nombre y los colores del
 * tablero de cotizaciones (`cotizacionEstatusBadge`). Única definición para la
 * tabla de cotizaciones de la oportunidad y el selector de "Ligar".
 */
export function CotizacionEstatusBadge({ cotizacion }: { cotizacion: OpportunityCotizacion }) {
  const badge = cotizacionEstatusBadge(cotizacion);
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
