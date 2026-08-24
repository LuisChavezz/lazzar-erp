// El `estado` de un folio de picking es el MISMO enum que el del módulo WMS
// (`PickingEstado`), así que se importa en vez de redeclararse: son el mismo
// campo del mismo modelo servido por dos endpoints, y duplicar la unión los
// dejaría divergir en silencio. Import de solo tipo — sin costo en runtime ni
// acoplamiento real entre features (`PedidoDetailContent` ya importa además
// `PICKING_STATUS_CONFIG` de ese módulo para pintarlo).
import type { PickingEstado } from "@/src/features/picking/interfaces/picking.interface";

/**
 * Configuración JSON congelada de un servicio de la talla (`bordado_config`,
 * `reflejante_config`, `corte_manga_config`, `cambio_talla_config`). El backend
 * los guarda como `JSONField` sin forma fija: `reflejante_config` viaja como
 * ARRAY y `bordado`/`corte_manga` como OBJETO (ver módulos OR/OCM), así que se
 * tipa laxo — esta vista de detalle solo necesita las banderas `lleva_*`, no
 * desglosar el contenido. `null` cuando el servicio no aplica.
 */
export type ServicioConfig = Record<string, unknown> | unknown[] | null;

/**
 * ── Seguimiento de picking (`tracker_picking`) ───────────────────────────────
 *
 * OJO con el FORMATO: TODOS los KPIs del tracker viajan como STRING, y el
 * backend NO los normalizó — un `Decimal` en cero se serializa como el literal
 * `"0"` y uno distinto de cero con 4 decimales (`"90.0000"`). O sea: el MISMO
 * campo llega con dos formatos según su valor. Los campos de origen ENTERO
 * (`total_prendas_*`) llegan sin decimales (`"90"`).
 *
 * Consecuencia para el consumidor: nunca hacer `split(".")` ni asumir 4
 * decimales. Se leen con `safeParseAmount` (tolera `"0"`, `"90.0000"` y
 * `null`) y se presentan con `formatQuantityValue`; los porcentajes pasan por
 * `parsePercentageValue`, que además acota al rango 0–100.
 */

/**
 * KPIs de avance de picking del PEDIDO COMPLETO (raíz de `PedidoDetail`).
 *
 * Los `pct_*` ya vienen en escala 0–100 (no 0–1) y topados por el backend en
 * `"100.0000"` — el frontend no los recalcula ni los reescala.
 *
 * NO son campos contables: son conteos de PRENDAS, así que el filtro por rol
 * del backend (`filtrar_campos_contabilidad_pedido`) no los toca y se pintan
 * para todos los roles.
 */
export interface PedidoTrackerPicking {
  /** Porcentaje del pedido con picking ASIGNADO. Escala 0–100. */
  pct_asignado_pedido: string;
  /** Porcentaje del pedido ya SURTIDO. Escala 0–100. */
  pct_surtido_pedido: string;
  /** Piezas totales del pedido. Origen ENTERO: llega sin decimales ("90"). */
  total_prendas_pedido: string;
  total_asignado: string;
  total_surtido: string;
}

/**
 * KPIs de avance de picking de UNA LÍNEA (`detalles[].tracker_picking`).
 * Mismas reglas de formato y de visibilidad que `PedidoTrackerPicking`; solo
 * cambian los nombres de los campos, que el backend sufija con `_linea`.
 */
export interface PedidoLineaTrackerPicking {
  pct_asignado_linea: string;
  pct_surtido_linea: string;
  /** Piezas de la línea. Origen ENTERO: llega sin decimales. */
  total_prendas_linea: string;
  total_asignado_linea: string;
  total_surtido_linea: string;
}

/**
 * Servicio extra facturable de un pedido (`PedidoServicioExtra`). NO reusa el
 * `QuoteExtraService` de cotizaciones: aquel trae `cantidad` y este no, y este
 * trae `visible_en_factura` que aquel no. `monto` es CONTABLE — el backend lo
 * elimina de la respuesta para usuarios sin rol contable, por eso es opcional.
 */
export interface PedidoServicioExtra {
  id: number;
  nombre: string;
  /** Contable: ausente para usuarios sin permiso de contabilidad. */
  monto?: string;
  visible_en_factura: boolean;
}

/**
 * Cabecera de un pedido (`Pedido`), tal como la devuelve `GET /ventas/pedidos/`
 * (listado) y, extendida con `detalles`, `GET /ventas/pedidos/{id}/` (detalle).
 *
 * IMPORTANTE — campos contables opcionales: el detalle (`retrieve`) pasa por
 * `filtrar_campos_contabilidad_pedido`, que ELIMINA (no anula) ~24 campos para
 * usuarios sin rol contable. El listado (`list`) hoy no filtra, pero se tipan
 * igual como opcionales aquí para que un consumidor del detalle no asuma su
 * presencia. Cada campo así marcado lleva el comentario "Contable".
 */
export interface Order {
  id: number;
  folio: string | null;
  folio_consecutivo: number | null;
  tipo_pedido: number;
  estatus: number;
  // ── FKs (PKs crudas) ─────────────────────────────────────────────────────
  empresa: number;
  sucursal: number;
  serie_folio: number | null;
  cliente: number;
  cotizacion: number | null;
  moneda: number;
  // ── Origen del pedido (banderas siempre presentes) ───────────────────────
  recompra: boolean;
  chat_online: boolean;
  pedido_online: boolean;
  prospeccion: boolean;
  recomendacion: boolean;
  amazon: boolean;
  google: boolean;
  publicidad: boolean;
  mercado_libre: boolean;
  redes_sociales: boolean;
  otro: boolean;
  mailing: boolean;
  // ── Forma de pago y contacto de facturación ──────────────────────────────
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  oc: string | null;
  /** Contable. */
  forma_pago?: string;
  /** Contable. */
  metodo_pago?: string;
  /** Contable. */
  uso_cfdi?: string;
  // ── Snapshot fiscal del cliente (foto al momento del pedido) ──────────────
  cliente_razon_social: string | null;
  cliente_nombre: string | null;
  cliente_rfc: string | null;
  /** PK cruda del régimen fiscal SAT (sin etiqueta en el serializer). */
  cliente_regimen_fiscal: number | null;
  cliente_direccion_fiscal: string | null;
  cliente_colonia: string | null;
  cliente_codigo_postal: string | null;
  cliente_ciudad: string | null;
  cliente_estado: string | null;
  cliente_giro_empresarial: string | null;
  // ── Condiciones de pago ──────────────────────────────────────────────────
  /** Contable. */
  anticipo_total?: boolean;
  /** Contable. */
  anticipo_parcial?: boolean;
  /** NO contable: sobrevive el filtro. */
  vendedor_autoriza: boolean;
  /** Contable. */
  pago_antes_embarque?: boolean;
  /** Contable. */
  por_confirmar?: boolean;
  /** Contable. */
  otra_cantidad?: boolean;
  /** Contable. */
  monto?: string | null;
  // ── Envío ────────────────────────────────────────────────────────────────
  empaque_ecologico: boolean;
  embarque_parcial: boolean;
  comentarios_parcialidad: string | null;
  destinatario: string | null;
  empresa_envio: string | null;
  telefono_envio: string | null;
  celular_envio: string | null;
  direccion_envio: string | null;
  colonia_envio: string | null;
  codigo_postal: string | null;
  ciudad_envio: string | null;
  estado_envio: string | null;
  referencias: string | null;
  // ── Servicios extra (importes) ───────────────────────────────────────────
  /** Contable. */
  envio?: string;
  /** Contable. */
  programa_bordados?: string;
  /** Contable. */
  bordado_pantalones_extras?: string;
  /** NO contable: sobrevive el filtro. */
  bordado_logotipo: boolean;
  /** Contable. */
  serigrafia?: string;
  /** Contable. */
  reflejante?: string;
  observaciones: string | null;
  // ── Cargos adicionales y totales ─────────────────────────────────────────
  /** Contable. */
  flete?: string;
  /** Contable. */
  seguros?: string;
  /** Contable. */
  anticipo?: string;
  /** Contable. */
  subtotal?: string;
  /** Contable. */
  descuento_global?: string;
  /** Contable. */
  ieps?: string;
  /** Contable: porcentaje entero (p.ej. 16), NO un importe. */
  iva?: number;
  /** Contable. */
  gran_total?: string;
  // ── Metadatos ────────────────────────────────────────────────────────────
  activo: boolean;
  created_at: string | null;
  updated_at: string | null;
  fecha_confirmacion: string | null;
  servicios_extras: PedidoServicioExtra[];
}

/**
 * Renglón del listado `GET /ventas/pedidos/` (`PedidoListSerializer`).
 *
 * El listado NO reusa `Order`: el backend expone un serializer minimalista de
 * 14 campos escalares (sin `detalles`/`tallas`/`servicios_extras`/`documentos`)
 * para que la tabla no pague el shape completo del detalle — mismo precedente
 * que `TransferenciaListItem` vs `TransferenciaDetail`.
 *
 * A diferencia de `Order`, aquí `subtotal` y `gran_total` NO son opcionales: el
 * `list` no pasa por `filtrar_campos_contabilidad_pedido`, así que ambos vienen
 * siempre como string. El resto de campos conserva el tipo de `Order`.
 */
export interface PedidoListItem {
  id: number;
  folio: string | null;
  folio_consecutivo: number | null;
  oc: string | null;
  cliente_razon_social: string | null;
  cliente_nombre: string | null;
  gran_total: string;
  subtotal: string;
  created_at: string | null;
  fecha_confirmacion: string | null;
  estatus: number;
  activo: boolean;
  cliente: number;
  moneda: number;
}

/**
 * Talla de una línea del detalle de pedido (`PedidoDetalleLinea.tallas`). La
 * VARIANTE VENDIBLE concreta vive aquí (no en la línea): cada talla trae su
 * propia `variante`/`variante_sku` y `cantidad` — a diferencia del patrón
 * plano producto XOR variante de `transferencia_detalle`/`picking_detalle`.
 *
 * `variante` es opcional por talla (`on_delete=SET_NULL`): cuando falta,
 * `variante`/`variante_nombre`/`variante_sku` llegan en `null`.
 */
export interface PedidoDetalleTalla {
  id: number;
  talla: number;
  talla_nombre: string;
  variante: number | null;
  /** Nombre completo de la variante; cae al SKU si el nombre viene vacío. */
  variante_nombre: string | null;
  variante_sku: string | null;
  cantidad: number;
  /** Contable. */
  precio_unitario?: string | null;
  /** Contable. */
  subtotal_talla?: string;
  // ── Banderas de servicios (siempre presentes) + su config congelada ──────
  lleva_bordado: boolean;
  bordado_config: ServicioConfig;
  lleva_reflejante: boolean;
  reflejante_config: ServicioConfig;
  lleva_corte_manga: boolean;
  corte_manga_config: ServicioConfig;
  lleva_cambio_talla: boolean;
  cambio_talla_config: ServicioConfig;
  // ── Avance de picking de ESTA talla ──────────────────────────────────────
  // Acumulado de TODOS los pickings del pedido para esta talla (los pickings
  // son parciales y repetibles). Strings con el formato inconsistente que
  // documenta `PedidoTrackerPicking`: un cero llega como `"0"`, no `"0.0000"`.
  // NO son contables — se pintan para todos los roles.
  cantidad_asignada_picking: string;
  cantidad_surtida_picking: string;
}

/**
 * Línea de `PedidoDetail.detalles`: una combinación PRODUCTO + COLOR (no una
 * variante concreta) — el desglose por talla/variante va anidado en `tallas`,
 * y `cantidad_total` es la suma de sus cantidades (para vistas resumidas).
 *
 * `costo_unitario` se tipa por completitud del contrato pero NO se muestra en
 * la UI operativa (es dato de costo/margen interno): misma convención que
 * `QuoteById.detalles[].costo_unitario`, tipado pero nunca renderizado por
 * `QuoteDetailsProducts` — los costos solo se exhiben en los reportes de
 * valuación de inventario (`system/reports`). Los cuatro importes de la línea
 * son CONTABLES (el backend los elimina para usuarios sin rol contable).
 */
export interface PedidoDetalleLinea {
  id: number;
  producto: number;
  producto_nombre: string;
  color: number | null;
  color_nombre: string | null;
  /** Color en hex (ej. `"#000000"`) — se pinta como swatch junto al nombre. */
  color_codigo_hex: string | null;
  /** Contable. */
  precio_lista?: string | null;
  /** Contable. */
  precio_unitario?: string;
  /** Contable. */
  costo_unitario?: string | null;
  /** Contable. */
  subtotal_linea?: string;
  cantidad_total: number;
  tallas: PedidoDetalleTalla[];
  /**
   * Avance de picking de la línea (producto+color), agregando sus tallas. NO
   * contable: se pinta para todos los roles. Ver `PedidoLineaTrackerPicking`
   * para el formato de los strings.
   *
   * Opcional por el mismo motivo que el `tracker_picking` de la raíz: una
   * respuesta de un backend anterior al campo no lo trae, y el tipo debe
   * obligar a comprobarlo en vez de prometerlo.
   */
  tracker_picking?: PedidoLineaTrackerPicking;
}

/**
 * Documento relacionado a un pedido, tal como lo lista `documentos` en el
 * retrieve (`GET /ventas/pedidos/{id}/`). Es una vista uniforme sobre 13 tipos
 * distintos de documento (cotización, órdenes de trabajo, factura, picking,
 * etc.), por eso `folio`/`fecha`/`estatus` son laxos: no todos los tipos los
 * traen de verdad.
 *
 * OJO — datos crudos por tipo (el frontend los filtra al pintar): `envio`,
 * `entrega` y `devolucion` son modelos stub y traen `folio`/`fecha` = `str(id)`
 * (el PK disfrazado, NO una fecha real). `movimiento_inventario` trae `folio` =
 * `str(id)` pero su `fecha` SÍ es real (`fecha_movimiento`) y su `estatus`
 * siempre `null`. Los demás tipos traen los tres campos reales.
 */
export interface PedidoDocumento {
  id: number;
  tipo: string;
  label: string;
  folio: string;
  fecha: string | null;
  estatus: string | null;
}

/**
 * Un picking del pedido, tal como lo lista `folios_picking` en el retrieve
 * (`GET /ventas/pedidos/{id}/`). Un pedido acumula VARIOS pickings a lo largo
 * del tiempo (son parciales y repetibles por talla), así que esto es el
 * historial de surtido del pedido.
 *
 * NO reusa la interfaz `Picking` del módulo WMS, a propósito: es otro
 * serializer, más chico (sin `picking_detalle`/`prioridad`/`tipo`/`fecha_*`) y
 * con OTROS NOMBRES para el mismo dato — aquí el almacén origen es
 * `almacen_origen`/`almacen_origen_nombre`, mientras que `Picking` lo llama
 * `almacen`/`almacen_nombre`. Tipar esto como `Picking` compilaría en falso y
 * dejaría `almacen_origen_nombre` fuera del tipo.
 *
 * `total_lineas`/`total_lineas_completas` describen SOLO las líneas de ESTE
 * folio (esta entrega), NO el avance del pedido — misma advertencia que ya
 * lleva `Picking` en el módulo WMS. El avance del pedido es `tracker_picking`
 * y nada más; sumar estos contadores entre folios daría otra cosa.
 *
 * Nullables: `almacen_destino`/`almacen_destino_nombre` y
 * `operador`/`operador_nombre` lo son en el esquema (hoy no hay filas nulas en
 * producción, pero el contrato las permite), así que la UI cae a "—".
 */
export interface PedidoFolioPicking {
  id: number;
  folio: string;
  estado: PickingEstado;
  created_at: string;
  /** Almacén ORIGEN: de donde se recolecta. Ojo con el nombre — ver arriba. */
  almacen_origen: number;
  almacen_origen_nombre: string;
  almacen_destino: number | null;
  almacen_destino_nombre: string | null;
  operador: number | null;
  operador_nombre: string | null;
  /** Líneas de ESTE folio, no del pedido. */
  total_lineas: number;
  total_lineas_completas: number;
  /** Strings con el formato inconsistente de `PedidoTrackerPicking`. */
  cantidad_asignada_total: string;
  cantidad_surtida_total: string;
}

/**
 * Respuesta de `GET /ventas/pedidos/{id}/`: la cabecera del pedido más
 * `detalles` (líneas producto+color con tallas anidadas) y `documentos` (los
 * documentos relacionados). Funciona igual con o sin cotización ligada
 * (`cotizacion: null`) — el detalle ya no depende de ella.
 *
 * Extiende `Order` (en vez de redeclarar) siguiendo el precedente de
 * `TransferenciaDetail extends TransferenciaListItem`: el detalle es asignable
 * donde se espera un renglón del listado. Misma advertencia que allá: si el
 * serializer de detalle llegara a divergir de `Order` en algún campo de
 * cabecera, TypeScript NO lo señalaría, porque este tipo hereda lo que sea que
 * declare aquel.
 *
 * `documentos` es opcional: puede faltar para usuarios sin permiso de
 * contabilidad o en casos borde, así que se tipa `?` y la UI cae al estado
 * vacío cuando no viene. `tracker_picking` y `folios_picking` siguen el mismo
 * criterio, por el mismo motivo — ver sus notas abajo.
 */
export interface PedidoDetail extends Order {
  detalles: PedidoDetalleLinea[];
  documentos?: PedidoDocumento[];
  /**
   * Avance de picking del PEDIDO COMPLETO. Va aquí y NO en `Order`: el
   * serializer del listado (`PedidoListSerializer` → `PedidoListItem`) no lo
   * expone, y `Order` es la forma que comparten listado y detalle.
   *
   * OPCIONAL a propósito, igual que `documentos`: el backend que lo introdujo
   * es más nuevo que este frontend, así que un despliegue anterior (o un
   * rollback) responde sin el campo. Tipar el hueco obliga a que TODO consumidor
   * lo compruebe, en vez de dejar que el tipo prometa algo que la respuesta
   * puede no traer y reventar con "Cannot read properties of undefined".
   */
  tracker_picking?: PedidoTrackerPicking;
  /**
   * Historial de pickings del pedido (el backend excluye los cancelados).
   * Opcional por el mismo motivo que `tracker_picking`; la UI cae a `[]`.
   */
  folios_picking?: PedidoFolioPicking[];
}
