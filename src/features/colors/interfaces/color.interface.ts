export interface Color {
  id: number;
  nombre: string;
  /** Código corto (máx. 3). Forma parte del SKU generado por el backend. */
  codigo: string;
  /** Siempre con `#` (`#RRGGBB`): los consumidores lo pintan tal cual como color CSS. */
  codigo_hex: string;
}

/**
 * Cuerpo del alta y de la edición. La edición es un PUT, así que también lleva
 * `codigo` (el que ya tenía: no se edita, ver `useColorForm`).
 */
export interface ColorCreate {
  nombre: string;
  codigo: string;
  codigo_hex: string;
}
