import {
  QUOTE_STATUS_FALLBACK_CLS,
  getQuoteStatusConfig,
} from "@/src/features/quotes/constants/quoteStatus";
import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { OpportunityCotizacion } from "../interfaces/opportunity-onboarding.interface";

/** Estatus de una cotización AUTORIZADA (`ESTATUS_AUTORIZADA` del backend). */
export const COTIZACION_ESTATUS_AUTORIZADA = 3;

/**
 * Una autorizada no se quita de la oportunidad (el backend responde 400: la
 * oportunidad dejaría de estar Ganada). Para ligar no hace falta mirarlo: el
 * backend no las ofrece en `disponibles` y rechaza ligarlas.
 */
export const isCotizacionAutorizada = (cotizacion: OpportunityCotizacion): boolean =>
  cotizacion.estatus === COTIZACION_ESTATUS_AUTORIZADA;

/**
 * Entrada completa de `StatusBadge` (etiqueta, clases y punto) del estatus, con
 * el nombre y los colores que la app usa en Cotizaciones y Mesa de Control
 * ("Por Autorizar"), no el del backend ("EN REVISION"), que solo queda de
 * respaldo para un estatus que el tablero no conozca, en gris neutro.
 */
export const cotizacionEstatusBadge = (
  cotizacion: OpportunityCotizacion
): Required<StatusBadgeConfigEntry> => {
  // Mismos colores y NOMBRES por estatus que el tablero (`QUOTE_STATUS_CONFIG`).
  const badge = getQuoteStatusConfig(cotizacion.estatus);
  return {
    label: badge?.label || cotizacion.estatus_display || "Sin estatus",
    cls: badge?.cls ?? QUOTE_STATUS_FALLBACK_CLS,
    dot: badge?.dot ?? "bg-slate-400",
  };
};
