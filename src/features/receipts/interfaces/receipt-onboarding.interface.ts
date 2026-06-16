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

export interface ReceiptOnboardingPurchaseOrder {
  id: number;
  folio: string;
  estatus: number;
  proveedor_id: number;
  proveedor_nombre: string;
  sucursal_id: number;
  fecha_oc: string;
}

export interface ReceiptOnboardingSearch {
  ordenes_compra: ReceiptOnboardingPurchaseOrder[];
}

export interface ReceiptOnboardingData {
  user: ReceiptOnboardingUser;
  empresa_id: number;
  catalogos: ReceiptOnboardingCatalogs;
  busqueda: ReceiptOnboardingSearch;
  orden_compra: unknown;
  detalle: unknown[];
}

