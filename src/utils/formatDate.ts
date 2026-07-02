/**
 * Convierte un string "yyyy-mm-dd" en una fecha local, evitando el desfase por
 * UTC que produce `new Date("yyyy-mm-dd")`. Devuelve null si el valor está
 * vacío o no tiene el formato esperado.
 */
export const parseLocalDate = (
  value: string | null | undefined,
): Date | null => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

/**
 * Formatea un string "yyyy-mm-dd" como fecha local es-MX. Devuelve "—" cuando
 * no hay valor y el valor original cuando no puede parsearse.
 */
export const formatLocalDate = (value: string | null | undefined): string => {
  const date = parseLocalDate(value);
  if (date) return date.toLocaleDateString("es-MX");
  return value ? value : "—";
};
