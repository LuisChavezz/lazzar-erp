/**
 * Reglas puras de las prendas y la cobertura de una orden de trabajo (bordado,
 * reflejante, corte de manga). Las comparten la pantalla
 * (`WorkOrderGarmentGroups`, `WorkOrderCoverageSheet`) y los PDF (EC-857), para
 * que el documento agrupe y rotule exactamente como la página. Sin React.
 */

/** Renglón normalizado de una orden de trabajo (bordado, reflejante, corte de manga). */
export interface WorkOrderGarmentLine {
  id: number;
  /** Agrupa los renglones: misma prenda (id de producto). */
  productoId: number | string | null;
  producto: string;
  color: string | null;
  talla: string | null;
  /** Piezas en ESTA orden. */
  cantidad: number;
  /** `undefined` = el backend no manda el dato y la columna no se pinta. */
  sku?: string | null;
  programado?: number | null;
  pedido?: number | null;
  pendiente?: number | null;
}

/** Una prenda + color con sus tallas y el total de piezas que suman en la orden. */
export interface WorkOrderGarmentGroup<T> {
  key: string;
  producto: string;
  color: string | null;
  rows: { item: T; line: WorkOrderGarmentLine }[];
  total: number;
}

/**
 * Agrupa los renglones por prenda (id de producto, o su nombre si no hay id) y
 * color, en el orden en que aparece cada grupo. El total de un grupo es la
 * suma de las piezas de sus tallas: una suma para mostrar, no un dato nuevo.
 */
export function groupWorkOrderGarments<T>(
  items: readonly T[],
  toLine: (item: T) => WorkOrderGarmentLine,
): WorkOrderGarmentGroup<T>[] {
  const groups = new Map<string, WorkOrderGarmentGroup<T>>();
  for (const item of items) {
    const line = toLine(item);
    const key = `${line.productoId ?? line.producto}|${line.color ?? ""}`;
    const group = groups.get(key) ?? { key, producto: line.producto, color: line.color, rows: [], total: 0 };
    group.rows.push({ item, line });
    group.total += line.cantidad;
    groups.set(key, group);
  }
  return [...groups.values()];
}

/**
 * Columnas opcionales de las prendas que se muestran: una columna aparece si
 * ALGÚN renglón de la orden (de cualquier grupo) trae el dato.
 */
export const workOrderGarmentOptionalColumns = (lines: readonly WorkOrderGarmentLine[]) => ({
  sku: lines.some((line) => line.sku !== undefined),
  programado: lines.some((line) => line.programado !== undefined),
  pedido: lines.some((line) => line.pedido !== undefined),
  pendiente: lines.some((line) => line.pendiente !== undefined),
});

/** Porcentaje de lo contratado que cubre la orden, redondeado; `null` sin contratado. */
export const workOrderCoveragePercent = (cubierta: number, contratada: number): number | null =>
  contratada > 0 ? Math.round((cubierta / contratada) * 100) : null;
