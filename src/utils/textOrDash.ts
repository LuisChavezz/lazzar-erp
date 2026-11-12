/** Guion largo que el proyecto usa para un valor vacío en tablas, detalles y PDFs. */
export const EMPTY_VALUE = "—";

/**
 * Valor de texto opcional del backend. Cubre `null`, `undefined` y la cadena
 * vacía (o solo espacios) con el guion largo; un valor con contenido se
 * devuelve tal cual, sin recortar.
 *
 * Vive en `src/utils` (y `DetailDialogPrimitives` lo reexporta) para que lo
 * usen también los documentos PDF, que no deben importar componentes de
 * pantalla.
 */
export const textOrDash = (value: string | null | undefined): string =>
  value && value.trim() !== "" ? value : EMPTY_VALUE;
