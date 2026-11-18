import type { SurtidoEtapa } from "../interfaces/order-fulfillment.interface";

interface EtapaConfig {
  label: string;
  /** Utilidades del chip (par claro/oscuro, mismas que los badges del ERP). */
  className: string;
}

/**
 * Presentación de `etapa` (`wms/api/surtido.py::_etapa`): DESPACHADO si lo
 * despachado cubre lo pedido, SURTIDO si lo surtido lo cubre, PARCIAL con algo
 * surtido y SIN_SURTIR en otro caso.
 */
export const SURTIDO_ETAPA_CONFIG: Record<SurtidoEtapa, EtapaConfig> = {
  SIN_SURTIR: {
    label: "Sin surtir",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
  },
  PARCIAL: {
    label: "Parcial",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  SURTIDO: {
    label: "Surtido",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  DESPACHADO: {
    label: "Despachado",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
};

/** Una etapa fuera del enum no rompe el render: chip neutro con el valor crudo. */
export const getSurtidoEtapaConfig = (etapa: string): EtapaConfig =>
  SURTIDO_ETAPA_CONFIG[etapa as SurtidoEtapa] ?? {
    label: etapa || "—",
    className: SURTIDO_ETAPA_CONFIG.SIN_SURTIR.className,
  };
