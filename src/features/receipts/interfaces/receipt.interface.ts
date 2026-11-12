import type { TipoCompra } from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";

export interface Receipt {
  id: number;
  folio: string;
  remision: string | null;
  factura_referencia: string | null;
  fecha_recepcion: string;
  estatus: number;
  activo: boolean;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  orden_compra: number | null;
  empresa: number;
  sucursal: number;
  proveedor: number | null;
  almacen: number;
  transportista: number | null;
  usuario: number;

  // Campos enriquecidos que devuelve GET /compras/recepciones/ (misma forma de
  // respuesta para WMS y para la vista de Compras filtrada por ?tipo_origen=OC).
  // Puramente aditivos. `almacen_nombre` siempre trae valor; los dos restantes
  // son null en recepciones de tipo OP (sin proveedor/OC).
  tipo_origen: "OC" | "OP";
  almacen_nombre: string;
  proveedor_nombre: string | null;
  orden_compra_folio: string | null;
  // Folio de la orden de producción de origen (`op.folio_op`, EC-879); null en
  // recepciones de tipo OC.
  op_folio: string | null;
  // Tipo de la orden de compra de origen: "MP" (OC, materia prima) o "PT"
  // (O, producto terminado). null en recepciones de tipo OP.
  orden_compra_tipo_compra: TipoCompra | null;
}

// ── Detalle de recepción ───────────────────────────────────────────────────────
// Forma que devuelve GET /compras/recepciones/{id}/. Es un recurso DISTINTO del
// listado `Receipt`: no trae los ids `orden_compra`/`op` ni `activo`, y en cambio
// agrega `detalles[]`, `estatus_label`, `sucursal_nombre` y `factura_referencia`.
// Desde EC-879 trae también el folio del origen (`orden_compra_folio` y
// `op_folio`, el que no corresponde a `tipo_origen` en null). Es un tipo
// compartido (WMS, Producción y Compras consumen la misma respuesta), por lo que
// modela ambos orígenes (OC/OP).

export interface ReceiptDetailLine {
  id: number;
  // Poblado en renglones de origen OC; null en origen OP. El shape es el mismo
  // para ambos orígenes.
  orden_compra_detalle: number | null;
  producto: number;
  producto_nombre: string;
  // Poblado en origen OP y en OC de producto terminado comprada por SKU (el
  // backend lo copia del renglón de la OC); null en materia prima.
  producto_variante: number | null;
  // SKU de esa variante; opcional porque el backend lo agregó después. `null`
  // cuando el renglón no tiene variante (materia prima).
  producto_variante_sku?: string | null;
  /**
   * Códigos del PRODUCTO (no de la variante); opcionales, `null` si no tiene.
   * Identifican la materia prima, que no tiene SKU. `producto_cod_proscai` es
   * el que reconoce el operario.
   */
  producto_codigo?: string | null;
  producto_cod_proscai?: string | null;
  // Nombre de la talla de la variante (EC-879); null sin variante (materia
  // prima) o sin talla.
  producto_variante_talla: string | null;
  ubicacion: number | null;
  // Ubicación resuelta por el backend (`str(ubicacion)`); null sin ubicación.
  ubicacion_nombre: string | null;
  // Ids de las FK `Lote` / `Serie` (enteros), no un código: el backend no
  // resuelve su texto.
  lote: number | null;
  serie: number | null;
  cantidad_recibida: string; // string numérico, p.ej. "1.0000"
}

export interface ReceiptDetail {
  id: number;
  tipo_origen: "OC" | "OP";
  // Folio del origen (EC-879): el de la OC en origen OC, el de la OP en origen
  // OP; el otro llega null. `OrdenCompra.folio` también puede ser null.
  orden_compra_folio: string | null;
  op_folio: string | null;
  folio: string;
  remision: string | null;
  factura_referencia: string | null;
  fecha_recepcion: string; // ISO datetime string
  estatus: number;
  estatus_label: string;
  sucursal: number;
  sucursal_nombre: string;
  proveedor: number | null;
  proveedor_nombre: string | null;
  almacen: number;
  almacen_nombre: string;
  transportista: number | null;
  // Nombre del transportista resuelto por el backend; null sin transportista.
  transportista_nombre: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  detalles: ReceiptDetailLine[];
}

