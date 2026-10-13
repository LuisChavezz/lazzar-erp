import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogos de oportunidades. Los valores son los CRUDOS del backend
 * (`ventas.Oportunidad`): se envían y se comparan tal cual.
 */

/** Etapas que se pueden CAPTURAR. */
export const ETAPA_OPORTUNIDAD_VALUES = ["Nueva", "Contactada", "Perdida"] as const;
export type EtapaOportunidad = (typeof ETAPA_OPORTUNIDAD_VALUES)[number];

export const ETAPA_NUEVA: EtapaOportunidad = "Nueva";
export const ETAPA_PERDIDA: EtapaOportunidad = "Perdida";

export const ETAPA_OPORTUNIDAD_OPTIONS: { value: EtapaOportunidad; label: string }[] = [
  { value: "Nueva", label: "Nueva" },
  { value: "Contactada", label: "Contactada" },
  { value: "Perdida", label: "Perdida" },
];

/**
 * Estados que el backend CALCULA (ver `Opportunity.estado`). `Cotizada` y
 * `Ganada` no se capturan: salen de las cotizaciones de la oportunidad.
 */
export const ESTADO_OPORTUNIDAD_VALUES = [
  "Nueva",
  "Contactada",
  "Cotizada",
  "Ganada",
  "Perdida",
] as const;
export type EstadoOportunidad = (typeof ESTADO_OPORTUNIDAD_VALUES)[number];

/**
 * Estados en los que la oportunidad está CERRADA: ya no se cotiza y sus
 * seguimientos no generan recordatorios. ÚNICA definición: la usan "Cotizar",
 * el formulario de seguimientos (fecha de recordatorio) y su historial (resumen
 * y resaltados). Son valores del ESTADO calculado, no de la etapa capturable,
 * aunque "Perdida" exista en ambos.
 */
export const ESTADO_PERDIDA: EstadoOportunidad = "Perdida";
export const ESTADO_GANADA: EstadoOportunidad = "Ganada";

export const ESTADOS_OPORTUNIDAD_CERRADA: readonly EstadoOportunidad[] = [
  ESTADO_PERDIDA,
  ESTADO_GANADA,
];

export const isOportunidadCerrada = (estado: string): boolean =>
  (ESTADOS_OPORTUNIDAD_CERRADA as readonly string[]).includes(estado);

/** Presentación del `estado`. Las llaves son los valores crudos del backend. */
export const ESTADO_OPORTUNIDAD_CFG: Record<EstadoOportunidad, StatusBadgeConfigEntry> = {
  Nueva: {
    label: "Nueva",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Contactada: {
    label: "Contactada",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Cotizada: {
    label: "Cotizada",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Ganada: {
    label: "Ganada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Perdida: {
    label: "Perdida",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/** Topes de longitud del modelo. */
export const OPORTUNIDAD_MAX_LENGTH = {
  titulo: 150,
  nombre_contacto: 120,
  telefono: 30,
  correo: 120,
  motivo_perdida: 255,
} as const;

/** `monto_estimado`: `max_digits=14, decimal_places=2` → 12 dígitos enteros. */
export const MONTO_ESTIMADO_MAX_ENTEROS = 12;
