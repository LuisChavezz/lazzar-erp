import type { RotationBoardRow, RotationFabricacion } from "../interfaces/rotation-board.interface";

/**
 * Lo que la columna "Material" muestra: los valores del filtro `?fabricacion=`
 * más uno que el backend no filtra, `NO_CALCULABLE` (hay BOM pero no se puede
 * calcular: p. ej. todas sus cantidades en 0, así que `fabricable_con_existencia`
 * es `null`).
 */
export type RotationFabricationCell = RotationFabricacion | "NO_CALCULABLE";

/**
 * Estado de material de una fila por variante.
 *
 * - Sin resurtido sugerido: "Sin BOM" si no tiene BOM; si lo tiene, `null`
 *   (no hay nada que fabricar: la celda dice "—").
 * - Con resurtido: "Sin BOM", "Alcanza"/"No alcanza" según
 *   `puede_fabricar_resurtido`, o "BOM no calculable" cuando hay BOM pero el
 *   backend no pudo calcular cuánto alcanza.
 */
export const rowFabricationCell = (
  row: Pick<
    RotationBoardRow,
    "tiene_bom" | "resurtido_sugerido" | "puede_fabricar_resurtido" | "fabricable_con_existencia"
  >,
): RotationFabricationCell | null => {
  if (!row.tiene_bom) return "SIN_BOM";
  if (row.resurtido_sugerido <= 0) return null;
  if (row.puede_fabricar_resurtido === true) return "ALCANZA";
  if (row.puede_fabricar_resurtido === false) return "NO_ALCANZA";
  return row.fabricable_con_existencia === null ? "NO_CALCULABLE" : null;
};
