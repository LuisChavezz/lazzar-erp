import type { PurchaseOrderDetalleItem } from "./purchase-order-onboarding.interface";

//
// ─── Información de rastreo para órdenes en tránsito ─────────────────────────
//

/** Un evento individual dentro del rastreo de la mercancía */
export interface TrackingEvento {
  fecha: string;
  hora: string;
  descripcion: string;
  ubicacion: string;
  /** Evento ya ocurrido */
  completado: boolean;
  /** Evento más reciente en el estado actual */
  esCurrent: boolean;
}

/** Información de rastreo de la orden en tránsito */
export interface TrackingInfo {
  numero_guia: string;
  transportista: string;
  origen: string;
  destino: string;
  fecha_estimada_llegada: string;
  eventos: TrackingEvento[];
}

export interface PurchaseOrder {
  id: number;
  folio: string;
  referencia: string;
  fecha_oc: string;
  fecha_entrega_estimada: string;
  fecha_autorizacion: string | null;
  estatus: number;
  estatus_label: string;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  empresa: number;
  sucursal: number;
  proveedor: number;
  proveedor_nombre: string;
  /** Información de rastreo — disponible para órdenes en tránsito o más avanzadas */
  tracking?: TrackingInfo;
  solicitud_compra: number;
  moneda: number;
  usuario: number;
  pedido: number;
}

//
// ─── Detalle de la orden de compra ──────────────────────────────────────────
//

/** Un renglón de producto dentro del detalle de la orden de compra */
export interface PurchaseOrderDetalle {
  /** Id del producto del catálogo — expuesto por `OrdenCompraDetalleReadSerializer`. */
  producto_id: number;
  descripcion: string;
  cantidad: number;
  descuento: string;
  importe: string;
  piezas: number;
  precio: string;
}

/**
 * Respuesta del endpoint GET /compras/ordenes/{id}/.
 *
 * Reutiliza toda la estructura base de {@link PurchaseOrder} y la extiende
 * con el arreglo `detalles` de renglones de producto. El endpoint de retrieve
 * (DRF) expone la relación anidada en plural, igual que `QuoteById.detalles`.
 */
export interface PurchaseOrderDetail extends PurchaseOrder {
  detalles: PurchaseOrderDetalle[];
}

//
// ─── Actualización de la orden de compra (PUT) ──────────────────────────────
//

/**
 * Campos editables del encabezado de la orden, derivados de {@link PurchaseOrder}
 * vía `Pick`. Se omiten los campos generados por el servidor (id, folio, estatus,
 * totales, fechas de auditoría, etc.).
 */
export type UpdatePurchaseOrderHeader = Pick<
  PurchaseOrder,
  | "referencia"
  | "fecha_oc"
  | "observaciones"
  | "sucursal"
  | "proveedor"
  | "moneda"
>;

/**
 * Cuerpo de la petición `PUT /compras/ordenes/{pk}/`.
 *
 * Refleja la forma del alta: encabezado editable + arreglo de renglones
 * (`detalles`), de modo que los productos se actualizan junto con el encabezado.
 * Los items reutilizan {@link PurchaseOrderDetalleItem} (la misma forma que el
 * detalle del POST de onboarding: `producto`, `cantidad`, `precio`,
 * `descripcion`).
 *
 * No existe un `CreatePurchaseOrderBody` equivalente al que aliasar: el alta usa
 * un POST de onboarding en dos partes (`{ orden_compra }` y `{ orden_compra_id,
 * detalle }`), de forma anidada y distinta a este cuerpo plano.
 */
export type UpdatePurchaseOrderBody = UpdatePurchaseOrderHeader & {
  detalles: PurchaseOrderDetalleItem[];
};

/** Parámetros para la acción de actualización de una orden de compra. */
export interface UpdatePurchaseOrderParams {
  pk: number;
  body: UpdatePurchaseOrderBody;
}
