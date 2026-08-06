export interface OperationsQuoteEmbroideryLocation {
  dtf: boolean;
  codigo: string;
  imagen: string;
  alto_cm: number;
  ancho_cm: number;
  pantones: string | null;
  revelado: boolean;
  sublimado: boolean;
  color_hilo: string | null;
  serigrafia: boolean;
  nuevo_ponchado: boolean;
}

export interface OperationsQuoteEmbroideryConfig {
  notas: string;
  ubicaciones: OperationsQuoteEmbroideryLocation[];
}

export interface OperationsQuoteReflectiveConfig {
  opcion: string;
  posicion: string;
  tipo: string;
}

export interface OperationsQuoteCutSleeveConfig {
  tipo: string;
}

export interface OperationsQuoteSizeChangeConfig {
  [key: string]: string | number | boolean | null;
}

export interface OperationsQuoteSize {
  id: number;
  talla_nombre: string;
  cantidad: number;
  precio_unitario: string;
  subtotal_talla: string;
  lleva_bordado: boolean;
  bordado_config: OperationsQuoteEmbroideryConfig | null;
  lleva_reflejante: boolean;
  reflejante_config: OperationsQuoteReflectiveConfig[] | null;
  lleva_corte_manga: boolean;
  corte_manga_config: OperationsQuoteCutSleeveConfig | null;
  lleva_cambio_talla: boolean;
  cambio_talla_config: OperationsQuoteSizeChangeConfig | null;
  sku: string;
  cotizacion_detalle: number;
  talla: number;
}

export interface OperationsQuoteDetail {
  id: number;
  tallas: OperationsQuoteSize[];
  producto_nombre: string;
  color_nombre: string | null;
  color_codigo_hex: string | null;
  precio_lista: string;
  precio_unitario: string;
  costo_unitario: string | null;
  subtotal_linea: string;
  cotizacion: number;
  producto: number;
  color: number | null;
  direccion_envio_cliente: string | null;
}

export interface OperationsQuoteExtraService {
  id: number;
  nombre: string;
  monto: string;
  cantidad: number;
  visible_en_factura: boolean;
  created_at: string;
  updated_at: string;
  cotizacion: number;
}

export interface OperationsQuote {
  id: number;
  estatus_label: string;
  detalles: OperationsQuoteDetail[];
  servicios_extras: OperationsQuoteExtraService[];
  cliente_nombre: string;
  cliente_razon_social: string;
  /**
   * Pedido generado a partir de esta cotización, resuelto por el backend con un
   * `Subquery` sobre `Pedido` (ver `_apply_filters` en `CotizacionViewSet`).
   *
   * Ambos campos son NULL-ables y en la mesa de control lo son a menudo: el
   * listado solo trae cotizaciones en estatus 2 (EN REVISION) y 5 (CAMBIOS
   * SOLICITADOS), y el pedido nace al autorizar. Una cotización recién enviada a
   * revisión todavía no tiene pedido; una que fue autorizada y luego se editó
   * dentro de la ventana permitida vuelve a estatus 5 conservando el suyo.
   * Además `Pedido.folio` es NULL-able por sí mismo.
   */
  pedido_id: number | null;
  pedido_folio: string | null;
  piezas: number;
  importe_sin_iva: number;
  estatus: number;
  autorizada_at: string | null;
  cambios_solicitados_at: string | null;
  aprobado_snapshot: string | null;
  created_at: string;
  updated_at: string;
  telefono_pagos: string;
  oc: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  anticipo_total: boolean;
  anticipo_parcial: boolean;
  vendedor_autoriza: boolean;
  pago_antes_embarque: boolean;
  por_confirmar: boolean;
  otra_cantidad: boolean;
  monto: string;
  embarque_parcial: boolean;
  comentarios_parcialidad: string;
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
  envio: string;
  programa_bordados: string;
  bordado_pantalones_extras: string;
  bordado_logotipo: boolean;
  serigrafia: string;
  reflejante: string;
  observaciones: string;
  flete: string;
  seguros: string;
  anticipo: string;
  subtotal: string;
  descuento_global: string;
  ieps: string;
  iva: number;
  gran_total: string;
  empresa: number;
  vendedor: number;
  sucursal: number;
  cliente: number;
  oportunidad: number | null;
  moneda: number;
}