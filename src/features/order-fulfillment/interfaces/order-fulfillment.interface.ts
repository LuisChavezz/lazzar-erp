/**
 * Avance de surtido por pedido (`GET /wms/surtido-pedidos/`, nucleo-erp #1223).
 * Pantalla informativa de solo lectura; los nombres de campo son los del
 * backend tal cual.
 *
 * Reglas del backend (`wms/api/surtido.py`):
 * - `surtidas` = lo surtido por picking (pickings y renglones no cancelados)
 *   con talla del pedido.
 * - `comprometidas` = Σ por talla de max(pedidas − surtidas, 0): una talla
 *   sobre-surtida no compensa a otra, y el encabezado = Σ renglones (#1247).
 * - `empacadas` y `despachadas` son informativas.
 * - El front NO recalcula ninguna cifra: solo acota el ANCHO de las barras.
 *
 * Las cantidades son `Decimal` en el backend y el `JSONEncoder` de DRF las
 * serializa como NÚMERO (`12.0`), no como string. Los `pct_*` son float 0–100
 * con 2 decimales, `0` cuando `pedidas` es 0, y NO se topan en 100.
 */

/** Etapa del pedido o de la talla, derivada por el backend. */
export type SurtidoEtapa = "SIN_SURTIR" | "PARCIAL" | "SURTIDO" | "DESPACHADO";

/** Totales comunes al pedido y a cada renglón por talla. */
export interface SurtidoTotales {
  pedidas: number;
  surtidas: number;
  comprometidas: number;
  empacadas: number;
  despachadas: number;
  pct_surtido: number;
  pct_empacado: number;
  pct_despachado: number;
}

/** Fila del listado (y encabezado del detalle). */
export interface SurtidoPedido extends SurtidoTotales {
  id: number;
  /** Nullable en el backend (`Pedido.folio`). */
  folio: string | null;
  cliente_nombre: string | null;
  sucursal_id: number | null;
  estatus: number;
  estatus_display: string;
  fecha_confirmacion: string | null;
  created_at: string | null;
  etapa: SurtidoEtapa;
  /**
   * Neto de salidas menos entradas de inventario ligadas al pedido FUERA de
   * WMS: movimientos activos, sin OP ni despacho; nunca negativo (nucleo-erp
   * #1249, #1250). Dato aparte: NO suma al surtido.
   */
  salidas_manuales: number;
}

/** Renglón por talla del detalle. */
export interface SurtidoPedidoRenglon extends SurtidoTotales {
  pedido_detalle_talla_id: number;
  pedido_detalle_id: number;
  producto_id: number | null;
  /**
   * Nombre del producto de catálogo o, en muestras sin catálogo, el nombre
   * capturado (`producto_nombre_externo`, nucleo-erp #1248). `null` si no hay
   * nombre de catálogo ni capturado.
   */
  producto_nombre: string | null;
  /** Nombre capturado de la línea (muestras); `null` si no hay. */
  producto_nombre_externo: string | null;
  /** `null` si la talla no tiene variante (p. ej. muestras). */
  sku: string | null;
  talla: string | null;
  color: string | null;
  etapa: SurtidoEtapa;
}

/** Detalle (`GET /wms/surtido-pedidos/{pedido_id}/`). */
export interface SurtidoPedidoDetalle extends SurtidoPedido {
  renglones: SurtidoPedidoRenglon[];
}
