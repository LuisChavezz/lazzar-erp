/**
 * Recálculo de consumos de una OP según la tela cortada —
 * `POST /produccion/orden-produccion/{op_id}/recalcular-consumos/`.
 *
 * MUEVE INVENTARIO: una SALIDA cuando el consumo sube y una ENTRADA a la
 * existencia de origen cuando baja. El registro de consumo original no se edita:
 * se agrega otro con cantidades firmadas, que aparece en `consumos[]` del
 * onboarding de la OP. No hay modo de vista previa.
 *
 * Errores 400 con forma DRF `{ campo: ["texto"] }` y llaves `permiso`,
 * `cantidad_real_corte`, `productos`, `op` e `inventario`; el 404 es
 * `{ msg }`. Ver `handleRecalculateConsumptionError`.
 */

export interface RecalculateConsumptionBody {
  /** Ids de producto con consumo en la OP. No vacía. */
  productos: number[];
  /**
   * Piezas realmente cortadas, entero > 0. El campo es opcional en el backend
   * (sin él usa el de la ruta crítica), pero el frontend SIEMPRE lo manda; al
   * recibirlo, el backend también lo guarda en la ruta crítica.
   */
  cantidad_real_corte: number;
}

/** Un producto cuyo consumo cambió. Cantidades con 4 decimales, como string. */
export interface ConsumptionChange {
  producto_id: number;
  consumido_antes: string;
  consumido_despues: string;
  /** Con signo: negativo cuando el consumo bajó. */
  delta: string;
}

export interface RecalculateConsumptionResponse {
  op: number;
  cantidad_real_corte: string;
  /** Id del registro de consumo agregado; `null` si nada cambió. */
  consumo_produccion: number | null;
  /** Solo los productos que cambiaron; `[]` si nada cambió. */
  cambios: ConsumptionChange[];
}
