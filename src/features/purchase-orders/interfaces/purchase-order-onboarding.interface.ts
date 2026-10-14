import type {
  TipoCompra,
  UpdatePurchaseOrderResponse,
} from "./purchase-order.interface";

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
  codigo: string | null;
  cod_proscai: string;
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

/**
 * Encabezados payload — sent in Step 1.
 *
 * No lleva `fecha_oc`: el servidor la fija al crear la orden y descarta la que
 * mande el cliente. `fecha_vencimiento` viaja como "yyyy-mm-dd" o `null` (sin
 * fecha de vencimiento). `referencia` es opcional: `""` se guarda como `null`.
 * `pedidos` son TODOS los pedidos a ligar (`[]` = ninguno); el campo legado
 * `pedido` nunca se manda.
 */
export interface PurchaseOrderEncabezados {
  orden_compra: {
    sucursal: number;
    proveedor: number;
    moneda: number;
    fecha_vencimiento: string | null;
    referencia: string;
    observaciones: string;
    tipo_compra: TipoCompra;
    pedidos: number[];
  };
}

/** A single line item in the order detail. */
export interface PurchaseOrderDetalleItem {
  producto: number;
  cantidad: number;
  precio: string;
  descripcion: string;
}

/**
 * Detalles payload — sent in Step 2. NUNCA lleva campos de encabezado: el
 * backend, por esta ruta (`orden_compra_id`), borra el folio y no valida el
 * bloqueo de `tipo_compra`.
 */
export interface PurchaseOrderDetalles {
  orden_compra_id: number;
  detalle: PurchaseOrderDetalleItem[];
}

/** Union type for the POST request body (accepts either encabezados or detalles). */
export type PurchaseOrderOnboardingPayload =
  | PurchaseOrderEncabezados
  | PurchaseOrderDetalles;

// ─── Response interfaces ─────────────────────────────────────────────────

/**
 * Response returned by the POST /compras/ordenes/onboarding/ endpoint. El
 * backend responde con la MISMA función que el PUT: la cabecera completa del
 * serializer de órdenes (la del listado) y los renglones como modelo plano.
 */
export type PurchaseOrderOnboardingResponse = UpdatePurchaseOrderResponse;
