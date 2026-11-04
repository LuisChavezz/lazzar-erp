/**
 * Contrato de `GET /inventarios/existencias/por-almacen/` y de su resumen
 * (`.../por-almacen/resumen/`), nucleo-erp EC-774 (PR #941). El esquema OpenAPI
 * no tipa `producto_info`/`ubicacion_info` ni el resumen: estos tipos salen del
 * código del backend (`inventarios/api/existencias_por_almacen.py` y
 * `ExistenciaPorAlmacenSerializer`).
 */

/** Estado de stock de una fila, calculado por el backend contra el `max_stock` del almacén completo. */
export type StockEstado = "full" | "ok" | "low" | "critical";

/** Rango del filtro "Existencias" (`?existencias=`). */
export type StockExistenciasRango = "cero" | "1-10" | "11-100" | "mas-100";

/**
 * Producto de la fila: el de la existencia, el de su variante o la muestra
 * (`variante_produccion`). `null` cuando la fila no tiene ninguno de los tres.
 * `sku`, `tipo` y `color` pueden faltar aun con producto (un producto sin
 * variante no tiene SKU; una muestra no tiene tipo).
 */
export interface StockPorAlmacenProductoInfo {
  nombre: string;
  sku: string | null;
  tipo: string | null;
  color: string | null;
}

/**
 * Ubicación de la fila. `nombre_completo` lleva el almacén DE LA UBICACIÓN,
 * que no siempre es el de la existencia (EC-780).
 */
export interface StockPorAlmacenUbicacionInfo {
  id_ubicacion: number;
  nombre_completo: string;
}

/** Fila de `existencias/por-almacen/`. */
export interface StockPorAlmacenItem {
  id: number;
  producto_info: StockPorAlmacenProductoInfo | null;
  ubicacion_info: StockPorAlmacenUbicacionInfo | null;
  /** Piezas enteras. */
  stock: number;
  /** Decimal en texto con 4 decimales (`"100.5000"`). */
  cantidad: string;
  /** ISO 8601 con zona de México, o `null` (filas que nunca registraron fecha). */
  fecha_actualizacion: string | null;
  estado: StockEstado;
}

/** Opción de un filtro de encabezado tal como la entrega el resumen. */
export interface StockFilterOption<TValue extends string | number = string> {
  /** Valor CRUDO que se envía al filtro (sin recortar: el backend compara exacto). */
  value: TValue;
  /** Etiqueta recortada para mostrar. */
  label: string;
}

/**
 * Resumen de `existencias/por-almacen/resumen/`: siempre del almacén completo,
 * no reacciona a filtros ni búsqueda. Los KPIs son conteos de filas, no de SKUs
 * distintos (igual que la pantalla antes de EC-766).
 */
export interface StockPorAlmacenResumen {
  almacen_id: number;
  max_stock: number;
  kpis: {
    total_registros: number;
    /** Filas con `stock > 0`. */
    skus_en_existencia: number;
    /** Filas en estado `low` o `critical`. */
    requiere_stock: number;
    total_stock: number;
  };
  opciones: {
    nombre: StockFilterOption[];
    tipo: StockFilterOption[];
    color: StockFilterOption[];
    /** `value` = `id_ubicacion`; puede incluir ubicaciones de otro almacén (EC-780). */
    ubicacion: StockFilterOption<number>[];
    /** `value` = `"AAAA-MM"`, del más reciente al más antiguo. */
    mes: StockFilterOption[];
  };
}
