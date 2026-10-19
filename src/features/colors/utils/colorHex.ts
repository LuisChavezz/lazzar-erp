/**
 * Una sola regla para `codigo_hex`:
 *
 * - el backend lo guarda CON `#` (`#RRGGBB`, como los colores ya cargados), y
 *   cotizaciones, pedidos y picking lo pintan tal cual como color CSS;
 * - el formulario lo guarda SIN `#`, que es lo que valida su schema.
 */

/** Del backend al formulario: sin ningún `#` inicial (tolera `##` o ninguno). */
export const toFormHex = (hex: string): string => hex.trim().replace(/^#+/, "").toUpperCase();

/** Del formulario al selector: exactamente un `#`. */
export const toPickerHex = (formHex: string): string => `#${toFormHex(formHex)}`;

/** Del formulario al backend: siempre `#RRGGBB` (un `RGB` corto se expande). */
export const toApiHex = (formHex: string): string => {
  const hex = toFormHex(formHex);
  const full = hex.length === 3 ? hex.replace(/./g, (digit) => digit + digit) : hex;
  return `#${full}`;
};
