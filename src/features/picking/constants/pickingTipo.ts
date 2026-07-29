import type { PickingTipo } from "../interfaces/picking.interface";

/**
 * Etiqueta humana de cada `tipo` de picking.
 *
 * El backend define estas etiquetas en `Picking.TipoPicking` pero NO las
 * serializa: `tipo` viaja como el código crudo (`"ORDER_PICKING"`), sin
 * ningún `tipo_label` acompañante —a diferencia de las órdenes de trabajo,
 * que sí exponen `tipo_orden_label`—. Se replican aquí, palabra por palabra
 * como las declara el modelo, para no mostrar el código en pantalla.
 */
export const PICKING_TIPO_LABELS: Record<PickingTipo, string> = {
  ORDER_PICKING: "Por pedido",
  BATCH_PICKING: "Por lote",
  WAVE_PICKING: "Por oleadas",
  ZONE_PICKING: "Por zonas",
};
