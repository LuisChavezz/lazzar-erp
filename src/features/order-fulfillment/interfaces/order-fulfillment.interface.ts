/**
 * Avance de surtido por pedido (`GET /wms/surtido-pedidos/`, nucleo-erp #1223).
 * Pantalla informativa de solo lectura; los nombres de campo son los del
 * backend tal cual.
 *
 * Reglas del backend (`wms/api/surtido.py`):
 * - `surtidas` = lo surtido por picking (pickings y renglones no cancelados).
 * - `comprometidas` = max(pedidas − surtidas, 0).
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
   * Salidas de inventario ligadas al pedido y sin OP. NO se muestra: desde
   * nucleo-erp 33d4369d el despacho también genera una SALIDA con `pedido` y
   * sin `op`, así que este total incluye lo despachado y no significa
   * "salidas manuales" (EC-913). Se tipa para documentar el contrato.
   */
  salidas_manuales: number;
}

/** Renglón por talla del detalle. */
export interface SurtidoPedidoRenglon extends SurtidoTotales {
  pedido_detalle_talla_id: number;
  pedido_detalle_id: number;
  producto_id: number | null;
  /** `null` en líneas de muestra (producto sin catálogo). */
  producto_nombre: string | null;
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
