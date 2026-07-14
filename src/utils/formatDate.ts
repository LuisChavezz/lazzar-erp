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

/**
 * Formatea una fecha (`Date` o string parseable por `Date`, p.ej. un ISO
 * completo) como "14 jul 2026" (es-MX: día 2 dígitos, mes abreviado, año).
 * Devuelve "—" para valores vacíos o que no parseen a una fecha válida.
 *
 * `timeZone: "UTC"` es para fechas-calendario sin componente de hora (p.ej.
 * un `Date` construido a medianoche UTC): fija el día renderizado entre SSR
 * e hidratación. Omítelo para timestamps reales (con hora) donde se quiere
 * el día en la zona horaria del usuario — p.ej. junto con una hora mostrada
 * por separado.
 */
export const formatShortDate = (
  value: string | Date | null | undefined,
  options: { timeZone?: string } = {},
): string => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(options.timeZone ? { timeZone: options.timeZone } : {}),
  });
};
