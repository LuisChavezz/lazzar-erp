import { safeParseAmount } from "@/src/utils/formatCurrency";
import type {
  InventoryPipelineOrdenApi,
  InventoryPipelineOrder,
  InventoryPipelineResultadoApi,
  InventoryPipelineRow,
  InventoryPipelineSize,
} from "../interfaces/inventory-pipeline.interface";

/**
 * ÚNICO criterio de orden de tallas del módulo. Reproduce el `sorted()` de
 * Python con que el backend arma las llaves: comparación simple de strings por
 * unidad de código, sin colación numérica ni de locale — así `"10"` va antes
 * que `"8"` y `"N/A"` cae donde le toca alfabéticamente. (Python compara por
 * code point y JS por unidad UTF-16; solo difieren fuera del BMP, que no
 * aparece en nombres de talla.)
 *
 * No se confía en el orden de llaves del JSON: JS reordena las llaves con forma
 * de entero (`"8"`, `"10"`) antes que las demás al parsear el objeto.
 */
export const compareSizeNames = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;

const mapOrder = (orden: InventoryPipelineOrdenApi): InventoryPipelineOrder => ({
  folio: orden.folio?.trim() ? orden.folio : null,
  estatus: orden.estatus_display,
  fechaEntregaEstimada: orden.fecha_entrega_estimada || null,
  comentarios: orden.comentarios?.trim() ? orden.comentarios : null,
});

/**
 * API → modelo de vista. Los totales se parsean a número para que las columnas
 * numéricas ordenen por valor (no como texto); el formato se aplica al pintar
 * con `formatExactQuantityValue`.
 */
export const mapInventoryPipelineRow = (
  item: InventoryPipelineResultadoApi,
): InventoryPipelineRow => {
  // Unión de las llaves de los tres mapas: el contrato dice que coinciden, pero
  // si alguno trajera una talla de más no se pierde — la ausente cuenta como 0.
  const tallaNames = Array.from(
    new Set([
      ...Object.keys(item.disponible_por_talla ?? {}),
      ...Object.keys(item.produccion_por_talla ?? {}),
      ...Object.keys(item.total_por_talla ?? {}),
    ]),
  ).sort(compareSizeNames);

  const tallas: InventoryPipelineSize[] = tallaNames.map((talla) => ({
    talla,
    disponible: safeParseAmount(item.disponible_por_talla?.[talla]),
    enOp: safeParseAmount(item.produccion_por_talla?.[talla]),
    total: safeParseAmount(item.total_por_talla?.[talla]),
  }));

  const disponible = safeParseAmount(item.disponible_total);
  const enOp = safeParseAmount(item.produccion_total);
  const ordenesProduccion = (item.ordenes_produccion ?? []).map(mapOrder);
  const ordenesCompra = (item.ordenes_compra ?? []).map(mapOrder);

  return {
    productoId: item.producto_id,
    codigo: item.codigo ?? "",
    descripcion: item.descripcion ?? "",
    disponible,
    enOp,
    total: disponible + enOp,
    comprasPendientes: safeParseAmount(item.compras_pendiente_cantidad),
    tallas,
    ordenesProduccion,
    ordenesCompra,
    opCount: ordenesProduccion.length,
    ocCount: ordenesCompra.length,
  };
};

export const mapInventoryPipelineRows = (
  items: InventoryPipelineResultadoApi[],
): InventoryPipelineRow[] => items.map(mapInventoryPipelineRow);
