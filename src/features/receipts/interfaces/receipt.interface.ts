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
}

// ── Detalle de recepción ───────────────────────────────────────────────────────
// Forma que devuelve GET /compras/recepciones/{id}/. Es un recurso DISTINTO del
// listado `Receipt`: no trae `orden_compra`/`op`/`orden_compra_folio`/`activo`, y
// en cambio agrega `detalles[]`, `estatus_label`, `sucursal_nombre` y
// `factura_referencia`. Es un tipo compartido (WMS, Producción y Compras
// consumirán la misma respuesta), por lo que modela ambos orígenes (OC/OP).

export interface ReceiptDetailLine {
  id: number;
  // Poblado en renglones de origen OC; null en origen OP (donde en su lugar
  // viene `producto_variante`). El shape es el mismo para ambos orígenes.
  orden_compra_detalle: number | null;
  producto: number;
  producto_nombre: string;
  producto_variante: number | null;
  ubicacion: number | null;
  // Siempre null: limitación estructural del backend (no es un bug). Se tipa como
  // `null` literal a propósito para que cualquier intento futuro de renderizarlo
  // como texto sea un error de compilación.
  ubicacion_nombre: null;
  lote: string | null;
  serie: string | null;
  cantidad_recibida: string; // string numérico, p.ej. "1.0000"
}

export interface ReceiptDetail {
  id: number;
  tipo_origen: "OC" | "OP";
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
  // Siempre null: limitación estructural del backend (no es un bug). Se tipa como
  // `null` literal a propósito (ver `ubicacion_nombre` arriba).
  transportista_nombre: null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  detalles: ReceiptDetailLine[];
}

