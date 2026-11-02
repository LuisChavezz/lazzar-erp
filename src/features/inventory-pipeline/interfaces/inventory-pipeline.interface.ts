// ── Contrato del API ────────────────────────────────────────────────────────
// `GET /inventarios/existencias/reporte-existencias-produccion-compras/`.
// Nombres de campo EXACTOS del backend. Solo los consume el mapper
// (`utils/inventory-pipeline.utils.ts`); la UI trabaja con el modelo de vista
// de abajo, así que un cambio de contrato aterriza en ese único archivo.

/** Cantidad decimal de inventario serializada como string con 4 decimales. */
export type DecimalString = string;

/**
 * Mapa talla → cantidad. Las llaves son `Talla.nombre`, o `"N/A"` cuando el
 * producto (o la variante) no maneja talla. `disponible_por_talla`,
 * `produccion_por_talla` y `total_por_talla` de un mismo producto comparten
 * llaves; `compras_por_talla` trae las suyas, que pueden no estar en los otros.
 */
export type CantidadPorTalla = Record<string, DecimalString>;

/** Orden (OP u OC) abierta asociada al producto. Sin id ni cantidad propia. */
export interface InventoryPipelineOrdenApi {
  /** `null` en la práctica: OC "Pendiente a confirmar" que aún no tienen folio. */
  folio: string | null;
  estatus_display: string;
  /** `YYYY-MM-DD` */
  fecha_entrega_estimada: string | null;
  comentarios: string | null;
}

export interface InventoryPipelineResultadoApi {
  producto_id: number;
  codigo: string;
  descripcion: string;
  disponible_por_talla: CantidadPorTalla;
  produccion_por_talla: CantidadPorTalla;
  /** Disponible + en OP de cada talla: NO incluye compras. */
  total_por_talla: CantidadPorTalla;
  disponible_total: DecimalString;
  produccion_total: DecimalString;
  /** Total del producto, con y sin variante. */
  compras_pendiente_cantidad: DecimalString;
  /**
   * Pendiente de compra por talla, solo de los renglones de OC con variante
   * (OC de PT por SKU, EC-684). Los de materia prima o sin SKU cuentan solo en
   * `compras_pendiente_cantidad`, así que la suma puede ser menor que ese total.
   * Opcional: un backend anterior a su desglose no lo manda.
   */
  compras_por_talla?: CantidadPorTalla;
  ordenes_produccion: InventoryPipelineOrdenApi[];
  ordenes_compra: InventoryPipelineOrdenApi[];
}

export interface InventoryPipelineResponseApi {
  resultados: InventoryPipelineResultadoApi[];
}

// ── Modelo de vista ─────────────────────────────────────────────────────────

/** Una talla del producto con sus tres cantidades ya numéricas. */
export interface InventoryPipelineSize {
  talla: string;
  disponible: number;
  enOp: number;
  /** `total_por_talla` del backend: disponible + en OP, sin compras. */
  total: number;
  /**
   * Pendiente de compra de la talla (solo renglones de OC con variante);
   * `null` si la respuesta no trae `compras_por_talla`.
   */
  compras: number | null;
}

export interface InventoryPipelineOrder {
  folio: string | null;
  estatus: string;
  /** `YYYY-MM-DD` o `null`; se formatea al pintar con `formatLocalDate`. */
  fechaEntregaEstimada: string | null;
  comentarios: string | null;
}

/** Renglón de la tabla: un producto. */
export interface InventoryPipelineRow {
  productoId: number;
  codigo: string;
  descripcion: string;
  disponible: number;
  /** Cantidad en OP abiertas — NO "por producir". */
  enOp: number;
  /** `disponible + enOp`. */
  total: number;
  comprasPendientes: number;
  /**
   * Compras pendientes que no se pueden atribuir a una talla (renglones de OC
   * sin variante): `comprasPendientes` − Σ compras por talla, nunca negativo.
   */
  comprasSinTalla: number;
  /** ¿La respuesta trae `compras_por_talla`? Sin él no hay columna ni residuo. */
  comprasPorTallaDisponible: boolean;
  /** Ordenadas con `compareSizeNames` (el mismo orden que el backend). */
  tallas: InventoryPipelineSize[];
  ordenesProduccion: InventoryPipelineOrder[];
  ordenesCompra: InventoryPipelineOrder[];
  opCount: number;
  ocCount: number;
}
