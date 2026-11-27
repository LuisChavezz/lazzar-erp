/**
 * Contrato de `GET /wms/etiquetas-rfid/` (listado) y `GET /wms/etiquetas-rfid/{id}/`
 * (detalle).
 *
 * Desde EC-989 (nucleo-erp) el listado es LIGERO: no trae `etiquetas` (hasta
 * 10 000 EPC por impresión) ni `zpl_enviado`, y pagina con `?limit=&offset=`.
 * Por eso hay dos formas: `EtiquetaRFIDRow` (una fila del listado) y
 * `EtiquetaRFID` (el detalle, que conserva todo). El backend anterior a EC-989
 * todavía manda ambos campos en el listado; el tipo de la fila no los declara a
 * propósito, para que nadie los lea de una fila.
 *
 * El grano es UN EVENTO DE IMPRESIÓN, no una etiqueta/SKU vigente: el modelo
 * (`EtiquetaRFIDImpresion`) es un log append-only sin restricción de unicidad
 * sobre `producto_variante`, así que el mismo SKU puede tener muchos
 * renglones históricos. `etiquetas` (abajo) son los N tags físicos de ESTE
 * evento (N = `cantidad`), nunca de SKUs distintos: `EtiquetaRFIDDetalle` no
 * tiene FK a producto/variante, solo a `impresion`.
 */

/** Estatus de UN evento de impresión. Vocabulario real del backend — no
 *  inventar equivalentes ("Impresa"/"Reimpresión" no existen en el modelo). */
export type EtiquetaRFIDStatus = "PENDIENTE" | "EXITO" | "FALLIDO";

/** Estatus de UN tag físico dentro de una impresión (`etiquetas[].estado`) —
 *  vocabulario propio, distinto del estatus de la impresión. */
export type EtiquetaRFIDDetalleEstado = "PENDIENTE" | "IMPRESO" | "LEIDO" | "CANCELADO";

/** Un tag físico (EPC) de una impresión. Vacío por completo cuando la
 *  impresión se registró con `rfid_mode: false`. */
export interface EtiquetaRFIDDetalle {
  id: number;
  impresion: number;
  epc: string;
  barcode_value: string;
  serial: string | null;
  estado: EtiquetaRFIDDetalleEstado;
  created_at: string;
  updated_at: string;
}

/** Un evento de impresión de etiqueta(s) RFID, como lo trae el LISTADO. */
export interface EtiquetaRFIDRow {
  id: number;
  folio: string;
  empresa: number;
  sucursal: number | null;
  usuario: number | null;
  producto: number | null;
  producto_variante: number | null;
  producto_nombre: string;
  /** Compuesto "Producto - Color - Talla" armado por el backend
   *  (`ProductoVariante.save()`) — se muestra tal cual, no se separa. */
  producto_variante_nombre: string | null;
  /** `null` cuando la impresión se hizo por `producto` (sin variante). */
  sku: string | null;
  /** Código a nivel PRODUCTO (compartido por todas sus variantes); puede ser
   *  `null` si el producto no tiene `codigo` capturado. */
  codigo_producto: string | null;
  cantidad: number;
  rfid_mode: boolean;
  printer_name: string | null;
  printer_address: string | null;
  status: EtiquetaRFIDStatus;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
}

/** Un evento de impresión completo: el DETALLE (`GET .../{id}/`) y la respuesta
 *  del registro (`POST .../onboarding/`). */
export interface EtiquetaRFID extends EtiquetaRFIDRow {
  /** Provisto por el CLIENTE al registrar la impresión — el backend no genera
   *  ZPL en este flujo (solo en `GET /preview/`, endpoint distinto). Con
   *  frecuencia `null`. */
  zpl_enviado: string | null;
  /** Vacío cuando la impresión se registró con `rfid_mode: false`. Opcional a
   *  propósito: es el campo que EC-989 quitó del listado, y quien lo lea se
   *  cuida de que falte en vez de reventar. */
  etiquetas?: EtiquetaRFIDDetalle[];
}
