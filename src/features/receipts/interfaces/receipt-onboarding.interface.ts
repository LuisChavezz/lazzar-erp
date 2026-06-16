export interface ReceiptOnboardingUser {
  id: number;
  email: string;
}

export interface ReceiptOnboardingWarehouse {
  id_almacen: number;
  codigo: string;
  nombre: string;
  sucursal_id: number;
  requiere_ubicacion: boolean;
}

export interface ReceiptOnboardingLocation {
  id_ubicacion: number;
  almacen: number;
  pasillo: string | null;
  rack: string | null;
  nivel: string | null;
  posicion: string | null;
  nombre_completo: string | null;
}

export interface ReceiptOnboardingSerieRecepcion {
  id: number;
  serie: string;
  descripcion: string;
  activo: boolean;
}

export interface ReceiptOnboardingCatalogs {
  almacenes: ReceiptOnboardingWarehouse[];
  ubicaciones: ReceiptOnboardingLocation[];
  series_recepcion: ReceiptOnboardingSerieRecepcion[];
}

export interface ReceiptOnboardingPurchaseOrderVariante {
  id: number;
  sku: string;
  nombre: string;
  color_id: number;
  talla_id: number;
  producto_id: number;
}

export interface ReceiptOnboardingPurchaseOrderDetalle {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad_ordenada: string;
  cantidad_recibida: string;
  cantidad_pendiente: string;
  descripcion: string;
  variantes: ReceiptOnboardingPurchaseOrderVariante[];
}

export interface ReceiptOnboardingPurchaseOrder {
  id: number;
  folio: string;
  estatus: number;
  proveedor_id: number;
  proveedor_nombre: string;
  sucursal_id: number;
  fecha_oc: string;
  detalle: ReceiptOnboardingPurchaseOrderDetalle[];
}

export interface ReceiptOnboardingSearch {
  ordenes_compra: ReceiptOnboardingPurchaseOrder[];
}

export interface ReceiptOnboardingData {
  user: ReceiptOnboardingUser;
  empresa_id: number;
  catalogos: ReceiptOnboardingCatalogs;
  busqueda: ReceiptOnboardingSearch;
}

// ─── POST /compras/recepciones/onboarding/ body ────────────────────────────

export interface ReceiptCreateRecepcion {
  orden_compra: number;
  almacen: number;
  serie_codigo: string;
  fecha_recepcion: string;
  remision: string;
  factura_referencia: string;
  observaciones: string;
  transportista: number | null;
}

export interface ReceiptCreateDetalle {
  orden_compra_detalle: number;
  cantidad_recibida: string;
  ubicacion: number | null;
  producto_variante: number | null;
}

export interface ReceiptCreatePayload {
  recepcion: ReceiptCreateRecepcion;
  detalle: ReceiptCreateDetalle[];
}