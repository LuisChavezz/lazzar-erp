// ── Contrato del API ────────────────────────────────────────────────────────
// `GET /inventarios/existencias/reporte-existencias-produccion-compras/`.
// Nombres de campo EXACTOS del backend. Solo los consume el mapper
// (`utils/inventory-pipeline.utils.ts`); la UI trabaja con el modelo de vista
// de abajo, así que un cambio de contrato aterriza en ese único archivo.

/** Cantidad decimal de inventario serializada como string con 4 decimales. */
export type DecimalString = string;

/**
 * Mapa talla → cantidad. Las llaves son `Talla.nombre`, o `"N/A"` cuando el
 * producto no maneja talla. Los tres mapas por talla de un mismo producto
 * comparten el mismo conjunto de llaves; entre productos difieren.
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
  total_por_talla: CantidadPorTalla;
  disponible_total: DecimalString;
  produccion_total: DecimalString;
  /** Solo a nivel producto: el backend no lo desglosa por talla. */
  compras_pendiente_cantidad: DecimalString;
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
  total: number;
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
  /** Ordenadas con `compareSizeNames` (el mismo orden que el backend). */
  tallas: InventoryPipelineSize[];
  ordenesProduccion: InventoryPipelineOrder[];
  ordenesCompra: InventoryPipelineOrder[];
  opCount: number;
  ocCount: number;
}
