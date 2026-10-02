/**
 * Cumplimiento = `resultado / meta × 100`, calculado SOLO en cliente (el
 * backend no deriva nada y este valor nunca se envía).
 *
 * `null` cuando falta `meta` o `resultado`, o cuando `meta` es 0 (sin
 * división posible). Se admiten valores por encima de 100.
 */
export const getCumplimiento = (meta: string | null, resultado: string | null): number | null => {
  if (meta === null || resultado === null) {
    return null;
  }
  const metaValue = Number(meta);
  const resultadoValue = Number(resultado);
  if (!Number.isFinite(metaValue) || !Number.isFinite(resultadoValue) || metaValue === 0) {
    return null;
  }
  return (resultadoValue / metaValue) * 100;
};

const PERCENT_FORMAT = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "95.5 %" con un decimal, o "—" sin cumplimiento. Sin umbrales de color. */
export const formatCumplimiento = (value: number | null): string =>
  value === null ? "—" : `${PERCENT_FORMAT.format(value)} %`;
