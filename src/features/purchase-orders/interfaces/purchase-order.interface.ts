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
  observaciones: string;
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
