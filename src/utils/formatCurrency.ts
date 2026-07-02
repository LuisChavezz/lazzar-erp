export const formatCurrency = (
  value: number,
  options?: Intl.NumberFormatOptions,
) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    ...options,
  }).format(value);

/**
 * Convierte un string numérico de la API en número, devolviendo 0 cuando el
 * valor es nulo, vacío o no numérico. Evita que un único valor malformado
 * propague NaN a través de sumas/totales o se muestre como "NaN".
 */
export const safeParseAmount = (value: string | null | undefined): number => {
  const parsed = parseFloat(value ?? "0");
  return Number.isNaN(parsed) ? 0 : parsed;
};
