export const formatCurrency = (
  value: number,
  options?: Intl.NumberFormatOptions,
) => {
  const merged: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "MXN",
    ...options,
  };
  try {
    return new Intl.NumberFormat("es-MX", merged).format(value);
  } catch {
    // `currency` puede venir de un campo que en realidad es un nombre de
    // moneda (p.ej. "Peso Mexicano") en vez de un código ISO 4217 válido;
    // Intl.NumberFormat lanza en ese caso. Mostramos el número sin símbolo
    // de moneda en vez de romper el render.
    const rest: Intl.NumberFormatOptions = { ...merged };
    delete rest.currency;
    delete rest.style;
    return new Intl.NumberFormat("es-MX", rest).format(value);
  }
};

/**
 * Convierte un string numérico de la API en número, devolviendo 0 cuando el
 * valor es nulo, vacío o no numérico. Usa `Number()` en vez de `parseFloat()`
 * porque este último parsea parcialmente strings como "1,234.50" (devuelve
 * `1`) en vez de rechazarlos; `Number()` devuelve `NaN` para cualquier string
 * con caracteres no numéricos, evitando que un valor malformado propague un
 * total silenciosamente incorrecto.
 */
export const safeParseAmount = (value: string | null | undefined): number => {
  const parsed = Number(value ?? "0");
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Combina `safeParseAmount` + `formatCurrency` para los campos financieros
 * del backend, que llegan como string (o, en algunos renglones, number).
 * Usado por los documentos PDF y las plantillas de correo (cotización y
 * orden de compra).
 */
export const formatMoneyValue = (value: string | number): string =>
  formatCurrency(safeParseAmount(String(value)));

/**
 * Formatea una CANTIDAD (no dinero) como número plano es-MX, hasta 2 decimales,
 * sin símbolo de moneda. Para campos de existencias que llegan como string
 * decimal del backend ("10.0000"). Comparte `safeParseAmount` con los importes.
 */
export const formatQuantityValue = (value: string | number): string =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(
    safeParseAmount(String(value)),
  );
