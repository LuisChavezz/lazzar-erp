import type { RotationLimitante } from "./rotation-board.interface";

/**
 * `GET /planeacion/necesidades-materia-prima/?variante=&cantidad=[&sucursal=]`:
 * desglose del BOM de UN SKU para fabricar `cantidad` piezas. Responde 404 si
 * la variante no es de la empresa y 400 por campo (`cantidad` fuera de
 * 1–1 000 000, `sucursal` ajena o fuera del alcance del usuario).
 * Sin BOM: `tiene_bom: false`, `bom_id: null` y `materiales: []`.
 */
export interface VariantMaterial {
  componente_id: number;
  componente_nombre: string;
  unidad_bom: string | null;
  /** `null` cuando el insumo no tiene unidad de inventario en el catálogo. */
  unidad_inventario: string | null;
  unidad_inconsistente: boolean;
  obligatorio: boolean;
  por_pieza: number;
  existencia: number;
  /** `null` si `por_pieza` es 0. */
  alcanza_para: number | null;
  requerido: number;
  faltante: number;
}

export interface VariantMaterialNeeds {
  variante_id: number;
  sku: string;
  producto_id: number;
  producto_nombre: string;
  cantidad: number;
  tiene_bom: boolean;
  fabricable_con_existencia: number | null;
  limitante: RotationLimitante | null;
  bom_con_alertas: boolean;
  bom_id: number | null;
  puede_fabricar: boolean | null;
  materiales: VariantMaterial[];
}

export interface VariantMaterialNeedsParams {
  variante: number;
  cantidad: number;
  /** Sucursal del filtro del tablero; `null` = el alcance por defecto del usuario. */
  sucursal: number | null;
}
