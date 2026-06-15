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