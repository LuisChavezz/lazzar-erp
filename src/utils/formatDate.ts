/**
 * Convierte un string "yyyy-mm-dd" en una fecha local, evitando el desfase por
 * UTC que produce `new Date("yyyy-mm-dd")`. También acepta un datetime ISO
 * completo (con "T", p.ej. "2026-07-02T18:22:11.123456Z"), delegando en
 * `Date` nativo ya que ese formato sí codifica su propio offset. Devuelve
 * null si el valor está vacío o no tiene ninguno de los formatos esperados.
 */
export const parseLocalDate = (
  value: string | null | undefined,
): Date | null => {
  if (!value) return null;

  if (value.includes("T")) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

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
