import type { BomBulkDetalle } from "@/src/features/bom/interfaces/bom.interface";

// ── Onboarding ───────────────────────────────────────────────────────────────

export interface ProductionOrderOnboardingTalla {
  talla: string;
  color: string;
  cantidad: number;
}

export interface ProductionOrderOnboardingCantidades {
  total: number;
  tallas: ProductionOrderOnboardingTalla[];
}

export interface ProductionOrderOnboardingHabilitacion {
  codigo: string;
  descripcion: string;
  unidad: string;
  total: number;
}

export interface ProductionOrderOnboardingProducto {
  nombre: string;
  cantidades: ProductionOrderOnboardingCantidades;
  habilitacion: ProductionOrderOnboardingHabilitacion[];
}

/** Renglón de `detalles` de un consumo de material contra la orden. */
export interface ProductionOrderConsumoDetalle {
  producto: number;
  /**
   * Nullable: el service lo resuelve con
   * `getattr(detalle.producto, "nombre", None)`, así que un producto sin nombre
   * —o sin resolver— llega en `null`.
   */
  producto_nombre: string | null;
  /**
   * String decimal con 4 decimales
   * (`DecimalField(max_digits=18, decimal_places=4)`): es la resolución con que
   * el inventario mueve materiales, así que se formatea con
   * `formatExactQuantityValue`, no con `formatQuantityValue`.
   */
  cantidad: string;
}

/** Un consumo de materiales registrado contra la orden (puede haber varios). */
export interface ProductionOrderConsumo {
  consumo_produccion_id: number;
  detalles: ProductionOrderConsumoDetalle[];
}

export interface ProductionOrderOnboarding {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  /** Etiqueta ya resuelta de `estatus_op`, la misma que expone el listado. */
  estatus_op_display: string;
  prioridad: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  /** `TextField(blank=True, null=True)` en el modelo: puede llegar `null`. */
  observaciones: string | null;
  /** Bandera de cierre solicitado/aplicado sobre la orden. */
  cerrar_orden: boolean;
  activo: boolean;
  empresa: number;
  /** Nombre legible de la empresa (mismo criterio que en OB/OR/OCM). */
  empresa_nombre: string;
  sucursal: number;
  /** Nombre legible de la sucursal. */
  sucursal_nombre: string;
  pedido: number | null;
  /** `Pedido.folio`; `null` cuando la orden no tiene pedido o el folio no está asignado. */
  pedido_folio: string | null;
  ruta_produccion: number | null;
  usuario_asignado: number;
  /** Nombre ya resuelto del operador asignado. */
  usuario_nombre: string | null;
  /**
   * `{id, folio}` del pedido madre, armado por el mismo helper compartido que
   * ya usan bordado/reflejante/corte de manga (`armar_pedido_vinculado`).
   * OPCIONAL: se agregó al onboarding en el mismo cambio de backend que ya
   * llegó a los otros tres módulos, así que se tipa igual de cauto — no
   * asumir presente sin comprobarlo. `null` cuando la orden no tiene pedido.
   */
  pedido_vinculado?: { id: number; folio: string } | null;
  op_info: string;
  productos: ProductionOrderOnboardingProducto[];
  /** Consumos de material registrados contra la orden. Vacío si aún no hay ninguno. */
  consumos: ProductionOrderConsumo[];
}

// ── Create onboarding ────────────────────────────────────────────────────────

/** Renglón del detalle de una orden de producción (una variante a fabricar). */
export interface CreateProductionOrderDetalle {
  producto_variante_id: number;
  cantidad: number;
  unidad: number;
  observaciones: string;
}

/**
 * Cuerpo del POST de creación. El backend resuelve la lista de materiales (BOM)
 * automáticamente a partir de cada `producto_variante_id`, por lo que ya no se
 * envían `ruta_produccion` ni `producto_variante_ids`.
 *
 * `pedido` es OPCIONAL: el id de un pedido especial
 * (`GET /produccion/pedidos-especiales/`). Sin pedido la clave se OMITE —no se
 * manda `null` ni `""`—. Un pedido inválido regresa `400 { pedido: "..." }`.
 */
export interface CreateProductionOrderBody {
  empresa: number;
  sucursal: number;
  estatus_op: number;
  prioridad: number;
  observaciones: string;
  pedido?: number;
  orden_produccion_detalle: CreateProductionOrderDetalle[];
}

/** Respuesta del POST de creación (`201`). No repite el pedido vinculado. */
export interface CreateProductionOrderResponse {
  msg: string;
  op_id: number;
  folio_op: string;
  consumo_produccion_id: number;
  movimiento_inventario_id: number;
  movimiento_id: number;
}

// ── GET /produccion/orden-produccion/ ────────────────────────────────────────

/** Variante de producto embebida en el detalle de una OP (incluye nombres resueltos por el backend). */
export interface OPProductoVariante {
  id: number;
  producto_nombre: string;
  color_nombre: string;
  talla_nombre: string;
  nombre: string;
  sku: string;
  precio_base: string;
  activo: boolean;
  producto: number;
  empresa: number;
  color: number;
  talla: number;
}

/** Renglón de detalle de una orden de producción (una variante a fabricar con su BOM). */
export interface OrdenProduccionDetalle {
  op_detalle_id: number;
  producto_variante: OPProductoVariante;
  bom_detalle: BomBulkDetalle[];
  cantidad: string;
  observaciones: string;
  activo: boolean;
  op: number;
  bom: number;
  unidad: number;
  pedido_detalle: number | null;
}

/**
 * Renglón del listado `GET /produccion/orden-produccion/`.
 *
 * El backend sirve ese endpoint con `OrdenProduccionListSerializer`, que declara
 * campos explícitos: NO trae `orden_produccion_detalle` ni el resto de los
 * campos del modelo (`observaciones`, `empresa`, `ruta_produccion`,
 * `usuario_asignado`). `pedido` y `sucursal` llegan como PK crudos.
 *
 * `estatus_op_display` es la etiqueta ya resuelta del entero `estatus_op`; solo
 * existe en este serializer, no en el de retrieve.
 *
 * El objeto completo (con detalle) sigue disponible en
 * `GET /produccion/orden-produccion/{id}/` → `OrdenProduccion`.
 */
export interface ProductionOrderListItem {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  estatus_op_display: string;
  prioridad: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  activo: boolean;
  pedido: number | null;
  sucursal: number;
}

/**
 * Orden de producción completa, tal como la devuelve el retrieve
 * `GET /produccion/orden-produccion/{id}/`. El listado ya NO devuelve esta
 * forma — para eso está `ProductionOrderListItem`.
 */
export interface OrdenProduccion {
  op_id: number;
  orden_produccion_detalle: OrdenProduccionDetalle[];
  folio_op: string;
  estatus_op: number;
  prioridad: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  observaciones: string;
  activo: boolean;
  empresa: number;
  sucursal: number;
  pedido: number | null;
  ruta_produccion: number | null;
  usuario_asignado: number;
}
