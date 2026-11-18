import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estatus de un evento de Google Calendar. Son los tres que define la API de
 * Google (`events.status`) y el backend los reenvía tal cual
 * (`/ai/google/calendar/events/`, `item.get("status")`), así que también puede
 * llegar `null` si Google omite el campo.
 */
export const GOOGLE_EVENT_STATUSES = ["confirmed", "tentative", "cancelled"] as const;

export type GoogleEventStatus = (typeof GOOGLE_EVENT_STATUSES)[number];

export const GOOGLE_EVENT_STATUS_CFG: Record<GoogleEventStatus, StatusBadgeConfigEntry> = {
  confirmed: {
    label: "Confirmado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  tentative: {
    label: "Tentativo",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  cancelled: {
    label: "Cancelado",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

/**
 * Estilo de un estatus que no está en la config (o `null`): neutro y rotulado
 * como tal, nunca «Confirmado».
 */
export const GOOGLE_EVENT_STATUS_UNKNOWN_CFG: Partial<StatusBadgeConfigEntry> = {
  label: "Sin estatus",
};

/**
 * Clave para `StatusBadge`: `null` (Google omitió el campo) pasa a `""`. Un
 * estatus sin entrada en la config cae al neutro
 * (`GOOGLE_EVENT_STATUS_UNKNOWN_CFG`) dentro del propio `StatusBadge`.
 */
export const toGoogleEventStatusKey = (status: string | null | undefined): string =>
  status ?? "";
