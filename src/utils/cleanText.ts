/**
 * Texto presente y no vacío, ya recortado. `null` si no hay nada que pintar.
 *
 * Es el variante que devuelve `null` (no `"—"` como `textOrDash` de
 * `DetailDialogPrimitives`): sirve para decidir si un campo se pinta o se omite
 * por completo. Compartido por los popovers de configuración de bordado y
 * reflejante, que antes tenían cada uno su copia idéntica.
 */
export const cleanText = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
