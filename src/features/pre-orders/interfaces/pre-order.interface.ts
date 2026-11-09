/**
 * Pre-orden de producción (`/produccion/pre-ordenes/`). Nace sola al generar
 * o editar el BOM de una muestra: una por pedido, con las tallas de muestra
 * que ya tienen BOM. Sirve para conocer los materiales antes de la OP.
 */
export type PreOrderStatus =
  | "pendiente_validar"
  | "faltan_materiales"
  | "en_compra"
  | "lista"
  | "convertida"
  | "cancelada";

/** Referencia que traen `pedidos-especiales` en `pre_orden`. */
export interface PreOrderRef {
  id: number;
  estatus: PreOrderStatus;
  estatus_display: string;
  semaforo?: PreOrderSemaforo | null;
  fecha_estimada_material?: string | null;
}

/**
 * Lo calcula el backend: rojo si el material llega después del compromiso,
 * amarillo si llega con 3 días o menos de margen.
 */
export type PreOrderSemaforo = "verde" | "amarillo" | "rojo";

/** Regreso a `faltan_materiales` porque otra OP consumió el material. */
export interface PreOrderRegreso {
  fecha: string;
  motivo: string;
}

export interface PreOrderListItem {
  id: number;
  pedido: number;
  pedido_folio: string | null;
  cliente_nombre: string | null;
  sucursal: number | null;
  estatus: PreOrderStatus;
  estatus_display: string;
  op: number | null;
  op_folio: string | null;
  piezas_total: number;
  tallas_total: number;
  fecha_confirmacion_existencias: string | null;
  /** Compromiso del pedido (`YYYY-MM-DD`). */
  fecha_compromiso?: string | null;
  dias_en_estatus?: number;
  materiales_faltantes?: number;
  /** La entrega más tardía de sus OC (`YYYY-MM-DD`). */
  fecha_estimada_material?: string | null;
  regreso?: PreOrderRegreso | null;
  semaforo?: PreOrderSemaforo | null;
  created_at: string;
  updated_at: string;
}

export interface PreOrderLine {
  id: number;
  variante_produccion: number;
  sku: string;
  nombre: string;
  talla_nombre: string | null;
  color_nombre: string | null;
  pedido_detalle: number;
  cantidad: number;
}

export interface PreOrderMaterial {
  producto_id: number;
  codigo: string;
  nombre: string;
  unidad: string | null;
  requerido: number;
  existencia: number;
  /** Pedido en una OC y aún no recibido. */
  en_transito?: number;
  /** Lo que necesitan OTRAS pre-órdenes abiertas. */
  comprometido?: number;
  faltante: number;
  /** requerido − existencia − en tránsito: lo que de verdad falta pedir. */
  faltante_real?: number;
}

/**
 * OC ligada (creada por `confirmar-existencias`). Su forma exacta aún no se ha
 * visto en una respuesta real: todo lo que no es `id` es opcional.
 */
export interface PreOrderPurchaseOrderRef {
  id: number;
  folio?: string | null;
  estatus?: number | string | null;
  estatus_display?: string | null;
  estatus_label?: string | null;
  proveedor?: number | null;
  fecha_entrega_estimada?: string | null;
}

export interface PreOrderDetail extends PreOrderListItem {
  usuario_confirma: number | null;
  usuario_confirma_nombre: string | null;
  detalles: PreOrderLine[];
  materiales: PreOrderMaterial[];
  ordenes_compra: PreOrderPurchaseOrderRef[];
  necesidades?: PurchaseNeed[];
}

export type PurchaseNeedStatus = "pendiente" | "en_oc" | "recibida" | "huerfana" | "cancelada";

/**
 * Necesidad de compra (`/compras/necesidades/`): un material que le falta a
 * UNA pre-orden. Compras junta varias en una OC consolidada. Dentro de
 * `agrupadas/` llega recortada (sin material ni estatus: todas pendientes),
 * por eso esos campos son opcionales.
 */
export interface PurchaseNeed {
  id: number;
  material?: number;
  material_nombre?: string | null;
  material_codigo?: string | null;
  unidad?: string | null;
  cantidad: number;
  pre_orden?: number | null;
  pedido?: number | null;
  pedido_folio?: string | null;
  fecha_requerida?: string | null;
  estatus?: PurchaseNeedStatus;
  estatus_display?: string | null;
  orden_compra?: number | null;
  orden_compra_folio?: string | null;
  cantidad_recibida?: number;
  sobrante?: number;
  sucursal?: number;
  created_at?: string;
}

export interface PreOrderHistoryEvent {
  id: number;
  fecha: string;
  evento: string;
  evento_display: string;
  usuario: number | string | null;
  usuario_nombre?: string | null;
  descripcion: string | null;
}

export interface ConfirmarExistenciasResponse {
  /** Id de la OC en Borrador creada con los faltantes, si hubo. */
  orden_compra_creada?: number | null;
  estatus?: PreOrderStatus;
}

export interface CrearOpBody {
  centro_confeccion?: number;
  prioridad: number;
}

export interface CrearOpResponse {
  id?: number;
  folio?: string | null;
  pre_orden?: number;
  estatus?: PreOrderStatus;
}
