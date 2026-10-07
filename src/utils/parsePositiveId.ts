/**
 * Entero positivo en texto ("226") → número; cualquier otra cosa → `null`.
 * Solo dígitos: `Number()` aceptaría "1e1", " 2", "0x3" o "2.0". Para ids y
 * números de página que llegan crudos de la URL. Una llave repetida de
 * `searchParams` llega como arreglo: se toma el primer valor.
 */
export const parsePositiveId = (
  value: string | string[] | null | undefined,
): number | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};
