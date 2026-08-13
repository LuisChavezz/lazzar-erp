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
 * vacío cuando no viene.
 */
export interface PedidoDetail extends Order {
  detalles: PedidoDetalleLinea[];
  documentos?: PedidoDocumento[];
}
