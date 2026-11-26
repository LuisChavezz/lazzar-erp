/**
 * Pre-orden de producción (`/produccion/pre-ordenes/`). Nace sola al generar
 * o editar el BOM de una muestra: una por pedido, con las tallas de muestra
 * que ya tienen BOM. Sirve para conocer los materiales antes de la OP.
 */
export type PreOrderStatus =
  /** Resurtido recién creado por planeación: producción lo acepta o rechaza. */
  | "pendiente_aceptar"
  | "pendiente_validar"
  | "faltan_materiales"
  | "en_compra"
  | "lista"
  | "convertida"
  | "cancelada"
  /** Producción rechazó el resurtido; el motivo viene en `motivo_rechazo`. */
  | "rechazada";

/** Referencia que traen `pedidos-especiales` en `pre_orden`. */
export interface PreOrderRef {
  id: number;
  estatus: PreOrderStatus;
  estatus_display: string;
  /** `estatus_op` de la OP ligada (`7` Cancelado); `null` sin OP (EC-968). */
  op_estatus?: number | null;
  /** Su etiqueta ("Cancelado"); `null` sin OP. */
  op_estatus_display?: string | null;
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

/**
 * Por qué `crear-op/` no liga a la OP un pedido del resurtido (nucleo-erp#1370).
 * Se revisa en este orden: uno cancelado y dado de baja es `"cancelado"`.
 */
export type PedidoOmisionMotivo = "cancelado" | "dado de baja" | "de otra sucursal";

/**
 * De dónde sale `motivo_omision` de los pedidos ligados (EC-980):
 * - `vista_previa`: resurtido abierto, con el estado de hoy de cada pedido (se omitirá);
 * - `registrada`: lo que guardó `crear-op/` al crear la OP (se omitió); no se recalcula;
 * - `sin_registro`: convertido antes de que se guardara; `motivo_omision` siempre `null`.
 *
 * `null` en `pedidos_omitidos_fuente`: no aplica (pre-orden de pedido, resurtido
 * rechazado o cancelado sin convertirse).
 */
export type PedidosOmitidosFuente = "vista_previa" | "registrada" | "sin_registro";

/** Un pedido que `crear-op/` dejó fuera de la OP. `folio` puede venir `null`. */
export interface PedidoOmitido {
  id: number;
  folio: string | null;
  motivo: PedidoOmisionMotivo;
}

export interface PreOrderPedidoVinculado {
  id: number;
  folio: string | null;
  cliente_nombre: string | null;
  /** Por qué queda (o quedó) fuera de la OP; `null` si se liga o no se sabe (EC-980). */
  motivo_omision?: PedidoOmisionMotivo | null;
}

/** `pedido`: nace de un pedido especial (muestra); `resurtido`: alta manual para stock, sin pedido. */
export type PreOrderOrigen = "pedido" | "resurtido";

export interface PreOrderListItem {
  id: number;
  /** `null` en un resurtido. */
  pedido: number | null;
  origen?: PreOrderOrigen;
  origen_display?: string;
  /** Folio del pedido (`P-…`) o `"Resurtido · SKU"`, ya resuelto por el backend. */
  referencia?: string | null;
  producto?: number | null;
  producto_nombre?: string | null;
  sucursal_nombre?: string | null;
  notas?: string | null;
  motivo_rechazo?: string | null;
  /** Pedidos que cubre una pre-orden generada por planeación (opcional, varios). */
  pedidos_vinculados?: PreOrderPedidoVinculado[];
  /** Lo que guardó `crear-op/` (`[]` sin omitidos); solo tiene sentido con `pedidos_omitidos_fuente` no nulo. */
  pedidos_omitidos?: PedidoOmitido[] | null;
  pedidos_omitidos_fuente?: PedidosOmitidosFuente | null;
  pedido_folio: string | null;
  cliente_nombre: string | null;
  sucursal: number | null;
  estatus: PreOrderStatus;
  estatus_display: string;
  op: number | null;
  op_folio: string | null;
  /**
   * `estatus_op` de la OP ligada (`7` Cancelado) y su etiqueta; `null` sin OP
   * (EC-968). Con `7`, una Convertida se puede cancelar (`canCancelPreOrder`).
   */
  op_estatus?: number | null;
  op_estatus_display?: string | null;
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

/** Cómo surte el backend un renglón de resurtido: con BOM se fabrica; sin BOM y de compra, se compra. */
export type PreOrderLineTipo = "fabricado" | "compra";
export type PreOrderLineEstado = "pendiente" | "con_op" | "por_comprar" | "en_compra" | "recibido";

/** Avance de un renglón de resurtido: los campos de OP (fabricado) o de OC (compra). */
export interface PreOrderLineAvance {
  estado: PreOrderLineEstado;
  op?: number | null;
  op_folio?: string | null;
  orden_compra?: number | null;
  orden_compra_folio?: string | null;
  cantidad_recibida?: number | null;
}

export interface PreOrderLine {
  id: number;
  tipo_linea?: PreOrderLineTipo;
  avance?: PreOrderLineAvance | null;
  /** `m`, `kg`, `pz`… del producto; los fabricados siempre `pz`. */
  unidad?: string | null;
  variante_produccion: number;
  sku: string;
  nombre: string;
  talla_nombre: string | null;
  color_nombre: string | null;
  pedido_detalle: number | null;
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
  origen?: PreOrderOrigen;
  referencia?: string | null;
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

/** Quién hizo un evento del historial, como lo manda el backend (`PreOrdenEventoSerializer`). */
export interface PreOrderHistoryUser {
  id: number;
  /** Nombre completo o, si no tiene, su correo. */
  nombre: string;
}

export interface PreOrderHistoryEvent {
  id: number;
  fecha: string;
  /** `op_creada`, `op_cancelada` (EC-948), `cancelada`… */
  evento: string;
  evento_display: string;
  /** `{id, nombre}`; `number`/`string` se aceptan de respuestas anteriores. */
  usuario: PreOrderHistoryUser | number | string | null;
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
}

export interface CrearOpResponse {
  id?: number;
  folio?: string | null;
  pre_orden?: number;
  estatus?: PreOrderStatus;
  /** Pedidos del resurtido que no se ligaron a la OP; siempre viene (`[]` sin omitidos). */
  pedidos_omitidos?: PedidoOmitido[];
}

/**
 * `POST /produccion/pre-ordenes/`: alta de un resurtido de stock. Lo crea
 * planeación: muchos SKUs, una sola sucursal. Cada renglón va con `sku` (el
 * backend los resuelve de un jalón); los errores vuelven por renglón, en el
 * mismo orden.
 */
export interface CreateResurtidoBody {
  origen: "resurtido";
  sucursal: number;
  fecha_compromiso: string;
  /**
   * Un renglón por variante (`variante` o `sku`) o por producto sin variante
   * (`producto`, siempre se compra). La cantidad admite hasta 4 decimales en
   * lo que se compra; lo fabricado va en piezas enteras.
   */
  lineas: ResurtidoLineaBody[];
  /** Pedidos que cubre (opcional, uno o varios). */
  pedidos?: number[];
  notas?: string;
}

export type ResurtidoLineaBody =
  | { variante: number; cantidad: string }
  | { sku: string; cantidad: string }
  | { producto: number; cantidad: string };

/**
 * Una fila de `POST /produccion/pre-ordenes/disponibilidad/`: por variante o
 * por producto (el otro en `null`). Por producto suma todas sus variantes.
 */
export interface VariantAvailability {
  variante: number | null;
  producto?: number | null;
  sku?: string | null;
  existencia: number;
  /** En OP abiertas. */
  por_fabricar: number;
  /** En OC sin recibir. */
  por_comprar: number;
  /** Pedidos autorizados/en proceso (completos) + otros resurtidos abiertos. */
  comprometido: number;
  disponible: number;
}

/** 201: el detalle + avisos (p. ej. ya hay un resurtido abierto igual). */
export interface CreateResurtidoResponse extends PreOrderDetail {
  avisos?: string[];
}

export type ResurtidoTipoProducto = "MP" | "PT" | "COMPRAS";

/** Variante de un resultado de `catalogo-resurtido/`. */
export interface ResurtidoCatalogVariant {
  id: number;
  sku: string;
  nombre: string;
  talla: string | null;
  color: string | null;
  tipo_linea: PreOrderLineTipo | null;
}

/**
 * Un producto de `GET /produccion/pre-ordenes/catalogo-resurtido/`.
 * `tipo_linea` `null` = no se puede resurtir (terminado sin BOM ni `es_compras`).
 * Si trae `variantes`, se resurte por variante; si no, por producto.
 */
export interface ResurtidoCatalogItem {
  producto: number;
  nombre: string;
  codigo: string | null;
  tipo: string | null;
  unidad: string | null;
  unidad_id?: number | null;
  tipo_linea: PreOrderLineTipo | null;
  variantes: ResurtidoCatalogVariant[];
}
