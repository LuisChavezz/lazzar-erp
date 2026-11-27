// ── Devolución a proveedor ────────────────────────────────────────────────────
// `/compras/devoluciones-proveedor/` (nucleo-erp#1357 y #1413, EC-951): lo que
// calidad rechazó o puso en cuarentena se devuelve al proveedor. Lo rechazado
// nunca entró a existencias, así que el movimiento de inventario que deja es de
// delta 0 y no cambia el stock. Forma de `DevolucionProveedorSerializer`; el
// listado y el detalle usan el MISMO serializer.

/** `DevolucionProveedor.Estatus`: se crea `aplicada` y solo pasa a `cancelada`. */
export type SupplierReturnEstatus = "aplicada" | "cancelada";

/**
 * Renglón devuelto. Todos los decimales viajan como string: `cantidad` con 4
 * posiciones, `costo_unitario` con 8 (costo MXN del renglón de la OC) e
 * `importe` con 2. SKU, talla y color salen del renglón de la recepción
 * (nucleo-erp#1422): `null` sin variante (materia prima).
 */
export interface SupplierReturnLine {
  id: number;
  calidad_detalle: number;
  recepcion_detalle: number;
  producto: number | null;
  producto_nombre: string | null;
  producto_variante: number | null;
  producto_variante_sku: string | null;
  producto_variante_talla: string | null;
  producto_variante_color: string | null;
  variante_produccion: number | null;
  cantidad: string;
  costo_unitario: string;
  importe: string;
}

export interface SupplierReturn {
  id: number;
  /** Serie `DEVOLUCION_PROVEEDOR` de la sucursal o, sin serie, `DVP-<fecha y hora>`. */
  folio: string | null;
  estatus: SupplierReturnEstatus;
  calidad_inspeccion: number;
  recepcion: number;
  recepcion_folio: string | null;
  orden_compra: number | null;
  orden_compra_folio: string | null;
  proveedor: number | null;
  /** Razón social del proveedor. */
  proveedor_nombre: string | null;
  /** Nombre de la sucursal de la recepción (EC-975); nunca `null`. */
  sucursal_nombre: string;
  almacen: number;
  /** Nombre del almacén (EC-975); nunca `null`, pero puede llegar `""`. */
  almacen_nombre: string;
  motivo: string;
  /** Fecha y hora ISO del alta. */
  fecha: string;
  usuario: number | null;
  /** `get_full_name` del usuario: `""` si no tiene nombre capturado. */
  usuario_nombre: string | null;
  /** Lo que se reclama al proveedor: Σ cantidad × costo MXN de la OC (2 decimales). */
  total: string;
  movimiento_inventario: number | null;
  /** `""` mientras no se cancele. */
  motivo_cancelacion: string;
  fecha_cancelacion: string | null;
  cancelado_por: number | null;
  /** Nombre completo o correo; `null` sin cancelar. */
  cancelado_por_nombre: string | null;
  detalles: SupplierReturnLine[];
}

/**
 * Renglón de `GET .../pendientes/?calidad_inspeccion=`: lo rechazado o en
 * cuarentena de la inspección que aún falta devolver. Solo salen renglones con
 * `cantidad_pendiente > 0`, y una inspección anulada responde `[]`. SKU, talla
 * y color son `null` sin variante (materia prima).
 */
export interface SupplierReturnPendingLine {
  calidad_detalle: number;
  recepcion_detalle: number;
  resultado: "rechazo" | "cuarentena";
  producto: number | null;
  producto_nombre: string | null;
  producto_variante_sku: string | null;
  producto_variante_talla: string | null;
  producto_variante_color: string | null;
  /** Decimal en string; su número de decimales varía ("3.00", "1.5000"). */
  cantidad_pendiente: string;
}

/**
 * Cuerpo de `POST .../`. Sin `detalles` el backend devuelve TODO lo pendiente;
 * el diálogo siempre los manda, con la cantidad elegida por renglón.
 */
export interface CreateSupplierReturnPayload {
  calidad_inspeccion: number;
  motivo: string;
  detalles: { calidad_detalle: number; cantidad: string }[];
}
