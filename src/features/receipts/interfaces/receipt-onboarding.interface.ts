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

export interface ReceiptOnboardingSerieFolio {
  id_serie_folio: number;
  tipo_documento: string;
  serie: string;
  sucursal_id: number;
}

export interface ReceiptOnboardingCatalogs {
  almacenes: ReceiptOnboardingWarehouse[];
  ubicaciones: unknown[]; // adjust type if ubicaciones shape becomes known
  series_recepcion: ReceiptOnboardingSerieFolio[];
}

// ─── Órdenes: detalle ────────────────────────────────────────────────────────
// Shared detail item shape (purchase orders). Production-order details add
// `producto_variante_id` on top of this.
export interface ReceiptOnboardingPurchaseOrderDetalle {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad_ordenada: string;
  cantidad_recibida: string;
  cantidad_pendiente: string;
  descripcion: string;
}

export interface ReceiptOnboardingProductionOrderDetalle
  extends ReceiptOnboardingPurchaseOrderDetalle {
  producto_variante_id: number;
}

// ─── Órdenes: cabecera ───────────────────────────────────────────────────────
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

export interface ReceiptOnboardingProductionOrder {
  id: number;
  folio: string;
  estatus: number;
  pedido_id: number | null;
  sucursal_id: number;
  fecha_inicio: string;
  cerrar_orden: boolean;
  detalle: ReceiptOnboardingProductionOrderDetalle[];
}

export interface ReceiptOnboardingSearch {
  ordenes_compra: ReceiptOnboardingPurchaseOrder[];
  ordenes_produccion: ReceiptOnboardingProductionOrder[];
}

export interface ReceiptOnboardingData {
  user: ReceiptOnboardingUser;
  empresa_id: number;
  catalogos: ReceiptOnboardingCatalogs;
  busqueda: ReceiptOnboardingSearch;
}

// ─── Discriminated union — selección compartida entre Paso 1 y Paso 2 ─────────
// El usuario elige explícitamente QUÉ tipo de orden recepcionar; el `type`
// viaja junto con la orden para que el Paso 2 sepa con qué forma trabaja.
export type ReceiptOrderType = "compra" | "produccion";

export type ReceiptOrderCandidate =
  | { type: "compra"; order: ReceiptOnboardingPurchaseOrder }
  | { type: "produccion"; order: ReceiptOnboardingProductionOrder };

// ─── POST /compras/recepciones/onboarding/ body ──────────────────────────────

interface ReceiptCreateRecepcionBase {
  almacen: number;
  serie_codigo: string;
  fecha_recepcion: string;
  remision: string;
  factura_referencia: string;
  observaciones: string;
  transportista: number | null;
}

export interface ReceiptCreatePurchaseOrderRecepcion
  extends ReceiptCreateRecepcionBase {
  orden_compra: number;
}

export interface ReceiptCreateProductionOrderRecepcion
  extends ReceiptCreateRecepcionBase {
  orden_produccion: number;
}

export interface ReceiptCreatePurchaseOrderDetalle {
  orden_compra_detalle: number;
  cantidad_recibida: string;
  ubicacion?: number | null;
  producto_variante?: number | null;
}

export interface ReceiptCreateProductionOrderDetalle {
  orden_produccion_detalle: number;
  cantidad_recibida: string;
  ubicacion?: number | null;
  producto_variante?: number | null;
}

export interface ReceiptCreatePurchaseOrderPayload {
  recepcion: ReceiptCreatePurchaseOrderRecepcion;
  detalle: ReceiptCreatePurchaseOrderDetalle[];
}

export interface ReceiptCreateProductionOrderPayload {
  recepcion: ReceiptCreateProductionOrderRecepcion;
  detalle: ReceiptCreateProductionOrderDetalle[];
}

export type ReceiptCreatePayload =
  | ReceiptCreatePurchaseOrderPayload
  | ReceiptCreateProductionOrderPayload;
