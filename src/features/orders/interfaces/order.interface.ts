import { QuoteExtraService } from "../../quotes/interfaces/quote.interface";

export interface Order {
  id: number;
  folio: string;
  folio_consecutivo: number;
  servicios_extras: QuoteExtraService[];
  tipo_pedido: number;
  estatus: number;
  persona_pagos: string;
  correo_facturas: string;
  telefono_pagos: string;
  oc: string;
  forma_pago: string;
  metodo_pago: string;
  uso_cfdi: string;
  cliente_razon_social: string;
  cliente_nombre: string;
  cliente_rfc: string;
  cliente_direccion_fiscal: string;
  cliente_colonia: string;
  cliente_codigo_postal: string;
  cliente_ciudad: string;
  cliente_estado: string;
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
  activo: boolean;
  created_at: string;
  updated_at: string;
  fecha_confirmacion: string | null;
  empresa: number;
  sucursal: number;
  serie_folio: number;
  cliente: number;
  cotizacion: number | null;
  moneda: number;
  cliente_regimen_fiscal: number;
}

/**
 * Talla de una línea del detalle de pedido (`PedidoDetalleLinea.tallas`). La
 * VARIANTE VENDIBLE concreta vive aquí (no en la línea): cada talla trae su
 * propia `variante`/`variante_sku` y `cantidad` — a diferencia del patrón
 * plano producto XOR variante de `transferencia_detalle`/`picking_detalle`.
 */
export interface PedidoDetalleTalla {
  id: number;
  talla: number;
  talla_nombre: string;
  variante: number;
  /** Nombre completo de la variante (producto + color + talla concatenados). */
  variante_nombre: string;
  variante_sku: string;
  cantidad: number;
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
 * valuación de inventario (`system/reports`).
 */
export interface PedidoDetalleLinea {
  id: number;
  producto: number;
  producto_nombre: string;
  color: number;
  color_nombre: string;
  /** Color en hex (ej. `"#000000"`) — se pinta como swatch junto al nombre. */
  color_hex: string;
  precio_lista: string;
  precio_unitario: string;
  costo_unitario: string;
  subtotal_linea: string;
  cantidad_total: number;
  tallas: PedidoDetalleTalla[];
}

/**
 * Respuesta de `GET /ventas/pedidos/{id}/`: la cabecera del pedido más
 * `detalles` (líneas producto+color con tallas anidadas). Funciona igual con o
 * sin cotización ligada (`cotizacion: null`) — el detalle ya no depende de ella.
 *
 * Extiende `Order` (en vez de redeclarar) siguiendo el precedente de
 * `TransferenciaDetail extends TransferenciaListItem`: el detalle es asignable
 * donde se espera un renglón del listado. Misma advertencia que allá: si el
 * serializer de detalle llegara a divergir de `Order` en algún campo de
 * cabecera, TypeScript NO lo señalaría, porque este tipo hereda lo que sea que
 * declare aquel.
 */
export interface PedidoDetail extends Order {
  detalles: PedidoDetalleLinea[];
}