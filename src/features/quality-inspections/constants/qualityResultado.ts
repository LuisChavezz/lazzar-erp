import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { QualityResultado } from "../interfaces/quality-inspection.interface";

/**
 * Etiquetas del enum COMPLETO `CalidadInspeccionDetalle.RESULTADO_CHOICES`
 * (nucleo-erp, compras/models.py), para mostrar valores que vienen del backend.
 */
export const QUALITY_RESULTADO_LABELS: Record<QualityResultado, string> = {
  liberado: "Liberado",
  cuarentena: "Cuarentena",
  concesion_cc: "Concesión Control de Calidad",
  "concesion lazzar": "Concesión Lazzar",
  rechazo: "Rechazo",
};

/**
 * Resultados que se pueden CAPTURAR (select y schema de envío).
 *
 * `cuarentena` queda fuera: el backend abona a existencias toda cantidad
 * aprobada sin importar el resultado y no tiene un tercer destino para material
 * en cuarentena. Hasta que lo defina, una recepción con cuarentena se deja sin
 * inspeccionar (sigue en `EN_CALIDAD`).
 *
 * Solo `rechazo` tiene una regla ligada a las cantidades (aprobada = 0, ver el
 * schema); el resto solo está sujeto a la regla de la suma.
 */
export const QUALITY_RESULTADO_CAPTURABLE_VALUES = [
  "liberado",
  "concesion_cc",
  "concesion lazzar",
  "rechazo",
] as const satisfies readonly QualityResultado[];

export type QualityResultadoCapturable = (typeof QUALITY_RESULTADO_CAPTURABLE_VALUES)[number];

export const QUALITY_RESULTADO_OPTIONS = QUALITY_RESULTADO_CAPTURABLE_VALUES.map((value) => ({
  value,
  label: QUALITY_RESULTADO_LABELS[value],
}));

/** Badge del tipo de origen de la recepción (mismos colores que Recepciones). */
export const QUALITY_TIPO_ORIGEN_CFG: Record<string, StatusBadgeConfigEntry> = {
  OC: {
    label: "Orden de Compra",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  OP: {
    label: "Orden de Producción",
    cls: "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400",
    dot: "bg-purple-500",
  },
};
