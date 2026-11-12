import type { PreOrderRef } from "@/src/features/pre-orders/interfaces/pre-order.interface";
import type { EmbroideryOnboardingUbicacion } from "@/src/features/embroidery/interfaces/embroidery.interface";
import type { ReflectiveLineConfigEntry } from "@/src/features/reflective-orders/interfaces/reflective-order.interface";

/**
 * Pedido especial tal como lo lista `GET /produccion/pedidos-especiales/`.
 *
 * "Especial" = el pedido tiene al menos una línea de MUESTRA: un `PedidoDetalle`
 * con `producto_nombre_externo` no vacío (producto fuera de catálogo). El
 * backend lo deriva del nombre y no de `requiere_produccion`, que se
 * desincroniza (ver `_detalles_especiales_qs` en `produccion/api/views.py`).
 *
 * Respuesta LIGERA a propósito (`PedidoEspecialListSerializer`): solo lo que
 * Producción necesita para elegir cuál abrir. Arreglo plano, sin paginación ni
 * parámetros, ordenado en el servidor por `-fecha_confirmacion, -id` — en
 * Postgres los `null` van PRIMERO, así que los pedidos por confirmar encabezan
 * la lista. Ese orden se respeta tal cual.
 *
 * `folio` y `cliente_nombre` se declaran nullables igual que en `PedidoListItem`
 * (`orders/interfaces/order.interface.ts`): son las mismas columnas de `Pedido`.
 */
export interface SpecialOrderListItem {
  id: number;
  folio: string | null;
  cliente_nombre: string | null;
  /** Código crudo (`A`…`F`, `X`) o `null`; la etiqueta vive en `pedidoStatus`. */
  clasificacion: string | null;
  /** Datetime ISO con offset (medianoche local, p. ej. `…T00:00:00-06:00`) o `null`. */
  fecha_confirmacion: string | null;
  /**
   * Avance del alta de SKU, para leerlo sin entrar al detalle. Opcionales:
   * pedidos al backend; sin ellos la columna "SKU" muestra "—".
   *  - `tallas_total`: tallas con cantidad > 0 de las líneas de muestra.
   *  - `tallas_con_sku`: de esas, las que ya tienen `sku_produccion`.
   *  - `tallas_en_catalogo`: de esas, las que ya tienen `sku_catalogo`.
   */
  tallas_total?: number;
  tallas_con_sku?: number;
  tallas_en_catalogo?: number;
  /**
   * Lo que el ingeniero de producto necesita para priorizar. Opcionales:
   * pedidos al backend; sin ellos su columna no se muestra.
   */
  /** Fecha compromiso de entrega (`YYYY-MM-DD`) o `null`. */
  fecha_compromiso?: string | null;
  /** Líneas de muestra (prendas) del pedido. */
  prendas_total?: number;
  /** Piezas de las tallas con cantidad > 0. */
  piezas_total?: number;
  /** Servicios que lleva alguna talla del pedido. */
  servicios?: { bordado: boolean; reflejante: boolean; corte_manga: boolean };
  /** OP activas ligadas al pedido (vacío si aún no hay). */
  ordenes_produccion?: SpecialOrderOpRef[];
  /** Pre-orden de producción del pedido; `null` si aún no tiene (nace con el BOM). */
  pre_orden?: PreOrderRef | null;
  /** Órdenes ACTIVAS de bordado, reflejante y corte de manga del pedido (puede haber varias por tipo). */
  ordenes_servicio?: {
    bordado: ServiceOrderRef[];
    reflejante: ServiceOrderRef[];
    corte_manga: ServiceOrderRef[];
  };
  /**
   * Alerta de 24 h (EC-865), calculada en el servidor:
   *  - `horas_en_produccion`: horas enteras desde que se CREÓ el pedido.
   *  - `sin_avance`: sin pre-orden (BOM) ni OP.
   *  - `atrasado`: 24 h o más y sin avance.
   * El listado incluye pedidos dados de baja; desde EC-873 llegan con
   * `atrasado: false` (igual que los cancelados). La alerta además exige
   * `activo === true`. Opcionales: sin ellos no hay alerta.
   */
  horas_en_produccion?: number | null;
  sin_avance?: boolean;
  atrasado?: boolean;
  /** `Pedido.activo` (EC-873). Sin él, ninguna fila muestra la alerta. */
  activo?: boolean;
}

/** Orden de servicio (OB/OR/OCM) ligada a un pedido especial. */
export interface ServiceOrderRef {
  id: number;
  folio: string;
  /** Código numérico; los pasos viven en `constants/serviceSteps`. */
  estatus: number;
  estatus_display: string;
  /** La del PEDIDO (= `fecha_vence` en los listados de OB/OR/OCM); la orden no tiene propia. */
  fecha_compromiso: string | null;
  /** Operador asignado. */
  asignado: string | null;
  /** Maquilero; solo bordado. */
  proveedor?: string | null;
  /** Estatus en que estaba al detenerse; `null` si no está detenida o se detuvo antes de guardarse. */
  estatus_previo?: number | null;
  estatus_previo_display?: string | null;
}

/** OP ligada a un pedido especial, para la columna "OP". */
export interface SpecialOrderOpRef {
  op_id: number;
  folio_op: string;
  estatus_op: number;
  estatus_op_display: string;
}

/**
 * `bordado_config` de la talla. JSON LIBRE de la captura de ventas, así que
 * toda clave es opcional. Llega casi siempre como cascarón NO nulo aunque
 * `lleva_bordado` sea `false`: nunca se usa su presencia para decidir si el
 * servicio aplica — eso lo dice solo `lleva_bordado`.
 *
 * `tipos_servicio` no se pinta: se deriva de las banderas de técnica de cada
 * ubicación (`quotes/utils/deriveTiposServicio.ts`), que el popover de
 * ubicaciones ya muestra.
 *
 * `type` y no `interface` a propósito: un alias de objeto tiene firma de índice
 * implícita y así satisface `ServicioConfig`, el tipo que reciben los lectores
 * compartidos de `orders/utils/tallaServiceConfigs.ts`.
 */
export type SpecialOrderBordadoConfig = {
  notas?: string | null;
  ubicaciones?: EmbroideryOnboardingUbicacion[];
  tipos_servicio?: string[];
};

/** Talla de una línea especial (`PedidoDetalleTallaEspecialSerializer`). Sin precios. */
/** Programado contra realizado de un servicio, en piezas. */
export interface SpecialOrderServiceProgress {
  programado: number;
  realizado: number;
}

/**
 * Avance de producción de la talla. Cada servicio es `null` si la talla no lo
 * lleva. En reflejante y corte de manga los avances se capturan por orden, así
 * que el backend reparte `realizado` entre tallas en proporción a lo programado.
 */
export interface SpecialOrderTallaAvance {
  /** Piezas surtidas por picking. */
  surtido: number;
  bordado: SpecialOrderServiceProgress | null;
  reflejante: SpecialOrderServiceProgress | null;
  corte_manga: SpecialOrderServiceProgress | null;
}

export interface SpecialOrderTalla {
  id: number;
  /** Opcional: un backend anterior no lo trae. */
  avance?: SpecialOrderTallaAvance;
  talla_nombre: string;
  cantidad: number;
  /**
   * SKU de producción ya generado para esta talla, o `null`. Solo refleja
   * variantes de producción ACTIVAS. El alta es INCREMENTAL por línea: un
   * reintento solo genera las tallas con cantidad que aún no tienen variante,
   * así que una línea puede quedar con unas tallas con SKU y otras sin él.
   * Un valor en cualquier talla es la señal de que la línea ya pasó por un alta.
   */
  sku_produccion: string | null;
  /**
   * El SKU que generará el alta para esta talla, con la misma fórmula que el
   * backend (`{sku_prefijo}-{color.codigo}-{talla}` en mayúsculas). `null` si la
   * talla ya tiene variante, si la línea no tiene color o si su color no tiene
   * `codigo`. Llega también en tallas con `cantidad = 0`, que NO se generan.
   */
  sku_siguiente: string | null;
  /**
   * La variante de producción de esta talla ya se dio de alta en catálogo. Es
   * `false` también cuando la talla NO tiene variante (`sku_produccion` en
   * `null`), así que "pendiente de alta" exige además `sku_produccion`.
   */
  aplica_catalogo: boolean;
  /**
   * SKU de la `ProductoVariante` de catálogo de esta talla, o `null` (sin
   * variante, o variante aún sin alta en catálogo).
   */
  sku_catalogo: string | null;
  lleva_bordado: boolean;
  bordado_config: SpecialOrderBordadoConfig | null;
  lleva_reflejante: boolean;
  /** ARREGLO (no objeto, a diferencia de bordado) o `null`. */
  reflejante_config: ReflectiveLineConfigEntry[] | null;
  lleva_corte_manga: boolean;
  /**
   * `{ tipo: "1" }` en el 100 % de los datos reales: valor fijo que escribe el
   * formulario de cotización, sin significado conocido. Nunca se muestra.
   */
  corte_manga_config: { tipo?: string } | null;
  lleva_cambio_talla: boolean;
  /** Sin datos reales: forma desconocida. No se interpreta. */
  cambio_talla_config: unknown;
}

/** Categoría de producto de una línea de muestra. */
export interface SpecialOrderCategoria {
  id: number;
  nombre: string;
}

/** Línea de muestra del pedido (`PedidoDetalleEspecialSerializer`). */
export interface SpecialOrderLine {
  /** Id del `PedidoDetalle`: es el `pedido_detalle_id` del alta de SKU. */
  id: number;
  producto_nombre_externo: string;
  /** `null` cuando la línea no tiene color. El contrato NO expone el id del color. */
  color_nombre: string | null;
  /**
   * Categoría efectiva de la línea, la misma que usa el alta en catálogo: la
   * guardada en la línea (`PedidoDetalle.categoria_producto`, que también llena
   * "Dar de alta en catálogo" cuando falta) o, en pedidos anteriores a ese
   * campo, la de la línea de muestra de la cotización (por nombre y color).
   * `null` si no hay ninguna.
   */
  categoria_producto: SpecialOrderCategoria | null;
  /** `"MP{id}"`: prefijo del SKU de producción de cada talla. */
  sku_prefijo: string;
  tallas: SpecialOrderTalla[];
}

/**
 * Detalle de `GET /produccion/pedidos-especiales/{id}/`: los campos del
 * listado más `detalles`, que trae SOLO las líneas de muestra (nunca las de
 * catálogo del mismo pedido).
 *
 * NO comparte forma con el listado, así que el detalle hace su propia consulta
 * (no aplica el patrón "detalle desde la fila ya cargada").
 */
export interface SpecialOrderDetail extends SpecialOrderListItem {
  /**
   * Estatus del pedido (`PEDIDO_ESTATUS`). Un pedido CANCELADO sigue saliendo
   * en pedidos especiales, así que las acciones se deciden con este campo.
   */
  estatus: number;
  detalles: SpecialOrderLine[];
}

/**
 * Material del alta de SKU de muestra. Se captura UNA vez y el backend lo
 * replica en la lista de materiales de cada talla.
 */
export interface SampleSkuOnboardingMaterial {
  /** Id de `Producto` (materia prima, `tipo 2`) — no de variante. */
  componente: number;
  /** Decimal con 2 posiciones, por pieza. */
  cantidad: string;
  /** Id de unidad de medida. */
  unidad: number;
  /** Porcentaje con 2 posiciones. */
  desperdicio: string;
  obligatorio: boolean;
}

/**
 * Cuerpo de `POST /produccion/pedidos-especiales/{id}/variante-onboarding/`.
 *
 * `color` solo se envía cuando la línea NO tiene color: el backend lo exige en
 * ese caso y lo guarda en la línea. Si la línea ya tiene color solo acepta el
 * mismo, y como el detalle no expone su id, se omite.
 */
export interface SampleSkuOnboardingPayload {
  pedido_detalle_id: number;
  color?: number;
  materia_prima_detalle: SampleSkuOnboardingMaterial[];
  /**
   * También da de alta el producto y una variante por talla en el catálogo, con
   * la categoría de la línea. Solo se envía (`true`) cuando se marca.
   */
  alta_catalogo?: boolean;
}

/**
 * Cuerpo de `POST /produccion/pedidos-especiales/{id}/alta-catalogo/`.
 *
 * `categoria_producto` solo se envía cuando la línea NO tiene categoría: el
 * backend la guarda en la línea (en el mismo bloque atómico que el alta, así
 * que un `400` posterior la deshace). Si la línea ya tiene una, la enviada se
 * ignora en silencio (`201` con la de la línea), así que se omite.
 */
export interface AltaCatalogoPayload {
  pedido_detalle_id: number;
  categoria_producto?: number;
}

/**
 * Variante de producción (`VarianteProduccionSerializer`). Es la respuesta
 * `201` de `variante-onboarding` (un ARREGLO plano con una por talla con
 * cantidad; no trae el id del BOM) y de `alta-catalogo` (solo las variantes
 * dadas de alta en ESA llamada). Las tallas se identifican por `talla_nombre`.
 */
export interface SampleProductionVariant {
  id: number;
  sku: string;
  nombre: string;
  talla_nombre: string;
  aplica_catalogo: boolean;
  /** SKU de la variante de catálogo creada con `alta_catalogo`; `null` sin él. */
  sku_catalogo: string | null;
  pedido_detalle: number;
}

/**
 * Respuesta de `GET /catalogo/producto/siguiente-codigo/`. Es una vista previa:
 * el backend no reserva el código, el real se recalcula al crear.
 */
export interface NextCatalogProductCode {
  codigo: string;
}
