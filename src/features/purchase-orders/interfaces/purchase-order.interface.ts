
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