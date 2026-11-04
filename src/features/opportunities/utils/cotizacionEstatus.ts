import {
  QUOTE_STATUS_FALLBACK_CLS,
  getQuoteStatusConfig,
} from "@/src/features/quotes/constants/quoteStatus";
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
 * Etiqueta y clases del estatus, con el nombre que la app usa en Cotizaciones y
 * Mesa de Control ("Por Autorizar"), no el del backend ("EN REVISION"), que solo
 * queda de respaldo para un estatus que el tablero no conozca.
 */
export const cotizacionEstatusBadge = (
  cotizacion: OpportunityCotizacion
): { label: string; className: string } => {
  // Mismos colores y NOMBRES por estatus que el tablero (`QUOTE_STATUS_CONFIG`).
  const badge = getQuoteStatusConfig(cotizacion.estatus);
  return {
    label: badge?.label || cotizacion.estatus_display || "Sin estatus",
    className: badge?.cls ?? QUOTE_STATUS_FALLBACK_CLS,
  };
};
