import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
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

/** Mismos colores y NOMBRES por estatus que el tablero de cotizaciones (1…5). */
const BADGE_BY_ESTATUS = new Map(KANBAN_COLUMNS.map((column) => [column.estatus, column]));
const FALLBACK_BADGE = "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300";

/**
 * Etiqueta y clases del estatus, con el nombre que la app usa en Cotizaciones y
 * Mesa de Control ("Por Autorizar"), no el del backend ("EN REVISION"), que solo
 * queda de respaldo para un estatus que el tablero no conozca.
 */
export const cotizacionEstatusBadge = (
  cotizacion: OpportunityCotizacion
): { label: string; className: string } => {
  const badge = BADGE_BY_ESTATUS.get(cotizacion.estatus);
  return {
    label: badge?.label || cotizacion.estatus_display || "Sin estatus",
    className: badge?.badgeClass ?? FALLBACK_BADGE,
  };
};
