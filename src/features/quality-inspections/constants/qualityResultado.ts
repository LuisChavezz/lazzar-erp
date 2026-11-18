import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { QualityResultado } from "../interfaces/quality-inspection.interface";
import { RECEIPT_TIPO_ORIGEN_CFG } from "@/src/features/receipts/constants/receiptOrigin";

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

/**
 * Badge del tipo de origen de la recepción: el mismo de Recepciones. Calidad
 * solo ve OC y OP (la recepción de una SM de OB/OR nace CERRADA, EC-912).
 */
export const QUALITY_TIPO_ORIGEN_CFG: Record<string, StatusBadgeConfigEntry> = RECEIPT_TIPO_ORIGEN_CFG;
