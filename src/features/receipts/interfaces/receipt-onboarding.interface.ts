import type { TipoCompra } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";
import type { SalidaMaquilaOrigen } from "@/src/features/maquila-outputs/interfaces/salida-maquila.interface";

export interface ReceiptOnboardingUser {
  id: number;
  email: string;
}

export interface ReceiptOnboardingWarehouse {
  id_almacen: number;
  codigo: string;
  nombre: string;
  // FK nullable en el backend (almacén sin sucursal).
  sucursal_id: number | null;
  requiere_ubicacion: boolean;
}

// Forma mínima que devuelve el endpoint de onboarding — expone `sucursal_id`
// (id plano) y omite los campos de numeración/formato del catálogo completo.
// No reutiliza `SerieFolio` (features/series-folios) porque esa interfaz usa
// `sucursal` (no `sucursal_id`) y exige campos adicionales que este endpoint
// no devuelve — reutilizarla introduciría un desajuste de tipos.
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
// Shared detail item shape of both order types. Purchase-order details add the
// variant they were bought by (EC-684); production-order details add only
// `producto_variante_id`.
export interface ReceiptOnboardingOrderDetalleBase {
  id: number;
  producto_id: number;
  producto_nombre: string;
  cantidad_ordenada: string;
  cantidad_recibida: string;
  cantidad_pendiente: string;
  descripcion: string | null;
  /** SKU de la variante o de la muestra (nucleo-erp #1268). */
  sku?: string | null;
  /** Código raíz (modelo) del producto (nucleo-erp #1285). */
  producto_codigo?: string | null;
  /** Código Proscai del producto (nucleo-erp #1285). */
  producto_cod_proscai?: string | null;
  /** Muestra de fabricación especial (sin producto de catálogo). */
  variante_produccion_id?: number | null;
  /** Suma de todas las SM del renglón: solo referencia. */
  cantidad_en_maquila?: string;
  /**
   * SM del renglón con su pendiente. Al recibir una SM, el tope del renglón es
   * el `cantidad_pendiente` de ESA SM; los renglones sin ella no van en la SM.
   * `cantidad_pendiente` del renglón es solo lo de la OP directa.
   */
  salidas_maquila?: { id: number; folio: string; cantidad_pendiente: string }[];
}

// Variante (SKU) del renglón de OC: solo en las de producto terminado
// capturadas por SKU; todo `null` en materia prima y en renglones sin SKU.
// `color` y `talla` son NOMBRES. Mismos nombres que el retrieve de la OC. El
// submit no la manda: el backend la copia del renglón de la OC.
export interface ReceiptOnboardingPurchaseOrderDetalle
  extends ReceiptOnboardingOrderDetalleBase {
  producto_variante_id: number | null;
  producto_variante_sku: string | null;
  producto_variante_color: string | null;
  producto_variante_talla: string | null;
}

export interface ReceiptOnboardingProductionOrderDetalle
  extends ReceiptOnboardingOrderDetalleBase {
  producto_variante_id: number;
}

// ─── Órdenes: cabecera ───────────────────────────────────────────────────────
export interface ReceiptOnboardingPurchaseOrder {
  id: number;
  // null mientras la orden no tiene folio asignado (el onboarding puede listarla).
  folio: string | null;
  // "MP" (OC, materia prima) o "PT" (O, producto terminado). Solo las órdenes
  // de compra lo traen; las de producción no.
  tipo_compra: TipoCompra;
  estatus: number;
  proveedor_id: number;
  proveedor_nombre: string;
  sucursal_id: number;
  /**
   * Almacén destino elegido en la OC (EC-796), o `null`. Solo sugiere: el
   * formulario lo preselecciona si es de la sucursal de la OC, y sigue editable.
   */
  almacen_id: number | null;
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

/**
 * Renglón de una SM de OB/OR (nucleo-erp #1269). `id` es el que viaja en el
 * POST (`salida_maquila_detalle`); `cantidad_pendiente` es el tope de captura.
 */
export interface ReceiptOnboardingSalidaMaquilaDetalle {
  id: number;
  ob_detalle?: number | null;
  or_detalle?: number | null;
  producto_nombre: string | null;
  sku: string | null;
  /** Código raíz (modelo) del producto (nucleo-erp #1285). */
  producto_codigo?: string | null;
  /** Código Proscai del producto (nucleo-erp #1285). */
  producto_cod_proscai?: string | null;
  talla: string | null;
  color: string | null;
  descripcion: string | null;
  cantidad: string;
  cantidad_recibida: string;
  cantidad_pendiente: string;
}

/**
 * SM (salida a maquila) ENVIADA, pendiente de recibir (nucleo-erp #1217, EC-912).
 * La de OP se recibe con los renglones de su OP (`ordenes_produccion` por
 * `op_id`); la de OB/OR con sus propios renglones (`detalle`, #1269), que
 * cuentan piezas sin mover inventario. `folio_display` es
 * "SM-… · <folio del origen>", sin etiqueta del origen.
 */
export interface ReceiptOnboardingSalidaMaquila {
  id: number;
  folio: string;
  folio_display: string;
  origen: SalidaMaquilaOrigen;
  origen_folio: string;
  /** OP de la SM; `null` si viene de OB u OR. */
  op_id: number | null;
  centro_confeccion: number;
  centro_confeccion_nombre: string;
  sucursal_id: number;
  fecha_envio: string;
  /** Número JSON (no string como los renglones). */
  total_piezas: number | string;
  /**
   * Piezas que faltan por regresar: `total_piezas` menos lo recibido con la SM
   * en recepciones vivas (nucleo-erp #1254). Número JSON. Opcional por si un
   * backend anterior no lo manda.
   */
  piezas_pendientes?: number | string;
  /**
   * AUSENTE (no `null`) sin `R-PRODUCCION-COSTOS` (nucleo-erp #1235). La UI de
   * recepciones no lo muestra.
   */
  total?: number | string;
  /** Solo SM de OB/OR; ausente en un backend anterior a #1269 (sin renglones). */
  detalle?: ReceiptOnboardingSalidaMaquilaDetalle[];
}

export interface ReceiptOnboardingSearch {
  ordenes_compra: ReceiptOnboardingPurchaseOrder[];
  ordenes_produccion: ReceiptOnboardingProductionOrder[];
  /** Opcional: un backend anterior a #1217 no lo manda. */
  salidas_maquila?: ReceiptOnboardingSalidaMaquila[];
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

//
// Una SM se recibe de dos formas (EC-912):
//  - de OP: es una recepción de su OP (mismos renglones y tope) que además
//    manda `salida_maquila`, así que viaja como `produccion` con la SM puesta;
//  - de OB/OR: sin renglones ni inventario (`salida-maquila`).
export type ReceiptOrderCandidate =
  | { type: "compra"; order: ReceiptOnboardingPurchaseOrder }
  | {
      type: "produccion";
      order: ReceiptOnboardingProductionOrder;
      /** SM de esta OP que se recibe con ella; `null` = recepción normal de OP. */
      salidaMaquila: ReceiptOnboardingSalidaMaquila | null;
    }
  | { type: "salida-maquila"; salidaMaquila: ReceiptOnboardingSalidaMaquila };

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
  /** SM de esta OP que se recibe con ella (EC-912). */
  salida_maquila?: number;
  /** Cierra la SM aunque falten piezas (#1269). */
  cerrar_salida_maquila?: boolean;
}

/** SM de OB/OR: solo cabecera; el backend toma la orden y el maquilero de la SM. */
export interface ReceiptCreateSalidaMaquilaRecepcion
  extends ReceiptCreateRecepcionBase {
  salida_maquila: number;
  /** Cierra la SM aunque falten piezas (#1269). */
  cerrar_salida_maquila?: boolean;
}

/** Piezas que regresaron de un renglón de la SM de OB/OR; no mueve inventario. */
export interface ReceiptCreateSalidaMaquilaDetalle {
  salida_maquila_detalle: number;
  cantidad_recibida: string;
}

interface ReceiptCreateDetalleBase {
  cantidad_recibida: string;
  ubicacion?: number | null;
  producto_variante?: number | null;
}

export interface ReceiptCreatePurchaseOrderDetalle
  extends ReceiptCreateDetalleBase {
  orden_compra_detalle: number;
}

export interface ReceiptCreateProductionOrderDetalle
  extends ReceiptCreateDetalleBase {
  orden_produccion_detalle: number;
}

export interface ReceiptCreatePurchaseOrderPayload {
  recepcion: ReceiptCreatePurchaseOrderRecepcion;
  detalle: ReceiptCreatePurchaseOrderDetalle[];
}

export interface ReceiptCreateProductionOrderPayload {
  recepcion: ReceiptCreateProductionOrderRecepcion;
  detalle: ReceiptCreateProductionOrderDetalle[];
}

export interface ReceiptCreateSalidaMaquilaPayload {
  recepcion: ReceiptCreateSalidaMaquilaRecepcion;
  /** Vacío = todo lo pendiente (backend anterior a #1269 o SM sin renglones). */
  detalle: ReceiptCreateSalidaMaquilaDetalle[];
}

export type ReceiptCreatePayload =
  | ReceiptCreatePurchaseOrderPayload
  | ReceiptCreateProductionOrderPayload
  | ReceiptCreateSalidaMaquilaPayload;
