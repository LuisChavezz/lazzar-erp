import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Colores por estatus de un traspaso. El backend fija `"COMPLETADA"` por
 * defecto en `create()` (ver `Transferencia` en `stock-transfer.interface.ts`)
 * — es el único valor confirmado hoy, pero `StatusBadge` degrada a su estilo
 * gris por defecto ante cualquier otro que llegue del listado, así que no se
 * requiere el catálogo completo para renderizar de forma segura.
 */
export const TRANSFER_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  COMPLETADA: {
    label: "Completada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};
