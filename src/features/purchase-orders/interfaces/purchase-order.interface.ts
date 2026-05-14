
// ─── Ciclo de vida de una orden de compra (importación/compra a proveedor) ───

/** Estados del ciclo de vida desde creación hasta cierre contable */
export type PurchaseOrderLifecycleStatus =
  | 'borrador'           // OC recién creada, sin enviar
  | 'pendiente'          // Enviada a autorización interna
  | 'autorizada'         // Autorizada y comunicada al proveedor
  | 'en_transito'        // Proveedor envió mercancía — tránsito internacional
  | 'en_aduana'          // Proceso aduanal en puerto de entrada
  | 'en_camino_almacen'  // Liberada de aduana, en traslado terrestre
  | 'recibida'           // Recibida y validada en almacén destino
  | 'completada'         // RC creado, gastos cargados, proceso cerrado
  | 'cancelada';         // Cancelada en cualquier punto del flujo

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
  /** Nombre del proveedor — disponible solo en mock/demo */
  proveedor_nombre?: string;
  /** Estado del ciclo de vida detallado — disponible en mock/demo */
  lifecycle_status?: PurchaseOrderLifecycleStatus;
  /** Información de rastreo — disponible para órdenes en tránsito o más avanzadas */
  tracking?: TrackingInfo;
  solicitud_compra: number;
  moneda: number;
  usuario: number;
  pedido: number;
}

export interface PurchaseOrderCreate {
  folio: string;
  referencia: string;
  fecha_oc: string;
  fecha_entrega_estimada: string;
  fecha_autorizacion: string | null;
  estatus: number;
  subtotal: string;
  descuento: string;
  impuestos: string;
  total: string;
  observaciones: string;
  activo: boolean;
  empresa: number;
  sucursal: number;
  proveedor: number;
  solicitud_compra: number;
  moneda: number;
  usuario: number;
  pedido: number;
}