/**
 * Etiqueta de producto lista para imprimir en una Zebra (RFID/código de
 * barras). Módulo MAQUETA: no hay endpoint detrás — los registros los genera
 * `mocks/rfid-labels.mock.ts`. La forma de la interfaz sí imita la que
 * devolvería el backend (nombres en español, `*_nombre` denormalizados en el
 * renglón, igual que `Packing`/`Dispatch`) para que sustituirla por una
 * respuesta real no obligue a tocar columnas ni diálogo.
 */

/** Estatus de la ÚLTIMA impresión de la etiqueta. */
export type RfidLabelEstado = "IMPRESA" | "PENDIENTE" | "REIMPRESION";

export interface RfidLabel {
  id: number;
  /** SKU de la variante, tal como se imprime y se codifica en el `^BC`. */
  sku: string;
  producto_nombre: string;
  /** Color y talla viajan separados (como en `PackingDetalle`/`DespachoDetalle`);
   *  el listado los presenta juntos en una sola columna "Variante". */
  color_nombre: string;
  talla_nombre: string;
  /** Código corto interno impreso al pie de la etiqueta ("COD: 1042"). */
  codigo: string;
  estado: RfidLabelEstado;
  /** ZPL de la etiqueta, con el contenido de ESTE registro ya embebido en los
   *  campos `^FD`. Mock estático por registro: no se genera en tiempo real. */
  zpl: string;
}

/** Impresora Zebra detectada por Browser Print. Lista fija y compartida por
 *  TODOS los registros — a diferencia del resto de campos de `RfidLabel`, la
 *  impresora no es un dato propio de la etiqueta, así que no vive aquí (ver
 *  `constants/rfidLabelPrinters.ts`). */
export interface RfidLabelPrinter {
  id: string;
  nombre: string;
  ip: string;
}
