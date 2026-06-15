export interface PurchaseOrderOnboardingUser {
  id: number;
  email: string;
}

export interface PurchaseOrderOnboardingSucursal {
  id_sucursal: number;
  codigo: string;
  nombre: string;
}

export interface PurchaseOrderOnboardingMoneda {
  id: number;
  codigo_iso: string;
  nombre: string;
}

export interface PurchaseOrderOnboardingCatalogos {
  sucursales: PurchaseOrderOnboardingSucursal[];
  monedas: PurchaseOrderOnboardingMoneda[];
}

export interface PurchaseOrderOnboardingProveedor {
  id: number;
  codigo: string;
  nombre: string;
  razon_social: string;
  rfc: string;
}

export interface PurchaseOrderOnboardingProducto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio_base: number;
}

export interface PurchaseOrderOnboardingBusqueda {
  proveedores: PurchaseOrderOnboardingProveedor[];
  productos: PurchaseOrderOnboardingProducto[];
}

export interface PurchaseOrderOnboardingData {
  user: PurchaseOrderOnboardingUser;
  empresa_id: number;
  catalogos: PurchaseOrderOnboardingCatalogos;
  busqueda: PurchaseOrderOnboardingBusqueda;
}

// ─── Request body interfaces ────────────────────────────────────────────────

/** Encabezados payload — sent in Step 1. */
export interface PurchaseOrderEncabezados {
  orden_compra: {
    sucursal: number;
    proveedor: number;
    moneda: number;
    fecha_oc: string;
    referencia: string;
    observaciones: string;
  };
}

/** A single line item in the order detail. */
export interface PurchaseOrderDetalleItem {
  producto: number;
  cantidad: number;
  precio: string;
  descripcion: string;
}

/** Detalles payload — sent in Step 2. */
export interface PurchaseOrderDetalles {
  orden_compra_id: number;
  detalle: PurchaseOrderDetalleItem[];
}

/** Union type for the POST request body (accepts either encabezados or detalles). */
export type PurchaseOrderOnboardingPayload =
  | PurchaseOrderEncabezados
  | PurchaseOrderDetalles;

// ─── Response interfaces ─────────────────────────────────────────────────

/** The `orden_compra` object inside the POST response. */
export interface PurchaseOrderOnboardingResponseOrdenCompra {
  id: number;
  folio: string | null;
  referencia: string;
  fecha_oc: string;
  fecha_entrega_estimada: string | null;
  fecha_autorizacion: string | null;
  fecha_vencimiento: string | null;
  estatus: number;
  impuestos: string;
  total: string;
  tipo: string;
  total_piezas: number;
  subtotal: string;
  descuento: string;
  flete: string;
  seguros: string;
  porcentaje_iva: string;
  total_iva: string;
  gran_total: string;
  a_cuenta: string;
  observaciones: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  empresa: number;
  sucursal: number;
  proveedor: number;
  solicitud_compra: number | null;
  moneda: number;
  usuario: number;
  pedido: number | null;
}

/** Response returned by the POST /compras/ordenes/onboarding/ endpoint. */
export interface PurchaseOrderOnboardingResponse {
  orden_compra: PurchaseOrderOnboardingResponseOrdenCompra;
  detalle: PurchaseOrderDetalleItem[];
}