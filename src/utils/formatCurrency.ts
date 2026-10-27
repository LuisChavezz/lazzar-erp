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
    // de moneda en vez de romper el render; las opciones de decimales de quien
    // llama se conservan y, si no fijó ninguna, se usan 2 (como un importe).
    const rest: Intl.NumberFormatOptions = { ...merged };
    delete rest.currency;
    delete rest.style;
    if (rest.minimumFractionDigits === undefined && rest.maximumFractionDigits === undefined) {
      rest.minimumFractionDigits = 2;
      rest.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat("es-MX", rest).format(value);
  }
};

/**
 * Opciones para un importe de moneda DESCONOCIDA: número con 2 decimales y sin
 * símbolo. Se pasa como `options` a `formatMoneyValue`/`formatMoneyValueOrDash`
 * cuando no hay moneda que afirmar — un "$" sobre un importe en otra moneda (o
 * en varias mezcladas) diría algo falso.
 */
export const NO_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Opciones de formato para un importe en la moneda `monedaCodigo` (código ISO
 * del registro), SIEMPRE con 2 decimales: el backend manda los importes con 2, y
 * los decimales ISO por defecto de `Intl` redondearían, p. ej., un JPY a enteros.
 * Sin código, sin símbolo (`NO_CURRENCY_FORMAT`): caer al MXN por defecto de
 * `formatCurrency` pintaría un importe en USD con signo de pesos. Un código que
 * `Intl` no reconozca cae en el `catch` de `formatCurrency`: sin símbolo, pero
 * con los mismos 2 decimales.
 *
 * `overrides` (opcional) se aplica encima, con o sin moneda — p. ej.
 * `{ maximumFractionDigits: 0 }` para las tarjetas compactas o
 * `currencyDisplay` —; los decimales mínimos se acotan a los máximos pedidos.
 * Sin `overrides` devuelve exactamente lo mismo que siempre.
 */
export const moneyFormatFor = (
  monedaCodigo: string | null | undefined,
  overrides?: Intl.NumberFormatOptions,
): Intl.NumberFormatOptions => {
  const base: Intl.NumberFormatOptions = monedaCodigo
    ? { currency: monedaCodigo, minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : NO_CURRENCY_FORMAT;
  if (!overrides) return base;
  const maximumFractionDigits = overrides.maximumFractionDigits ?? 2;
  return {
    ...base,
    ...overrides,
    minimumFractionDigits: Math.min(overrides.minimumFractionDigits ?? 2, maximumFractionDigits),
    maximumFractionDigits,
  };
};

/**
 * ¿`Intl` tiene un símbolo propio para `monedaCodigo` (es-MX, `narrowSymbol`)?
 * Para los códigos sin símbolo (XTS, monedas privadas como QXA) `Intl` imprime
 * el propio código: donde la UI ya muestra el código al lado, el importe va sin
 * símbolo para no repetirlo ("XTS 12 XTS"). Un código que `Intl` rechaza
 * tampoco tiene símbolo (`formatCurrency` ya lo pinta sin él).
 */
export const currencyHasOwnSymbol = (monedaCodigo: string): boolean => {
  try {
    const symbol = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: monedaCodigo,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value;
    return symbol !== undefined && symbol.toUpperCase() !== monedaCodigo.toUpperCase();
  } catch {
    return false;
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
 *
 * `options` se pasa tal cual a `formatCurrency`; su uso habitual es
 * `{ currency: <código ISO del registro> }` cuando el importe NO está en la
 * moneda por defecto (MXN) — p. ej. una orden de compra en USD, que expone su
 * `moneda_codigo`. Sin `options` se comporta igual que antes.
 */
export const formatMoneyValue = (
  value: string | number,
  options?: Intl.NumberFormatOptions,
): string => formatCurrency(safeParseAmount(String(value)), options);

/**
 * Como `formatMoneyValue` pero devuelve "—" cuando el valor es `null`/
 * `undefined`, en vez de un engañoso "$0.00". Para los campos financieros que
 * el backend ELIMINA de la respuesta (filtro de contabilidad de pedidos y de
 * órdenes de compra) según el rol del usuario: un importe ausente no es cero,
 * es "no visible".
 */
export const formatMoneyValueOrDash = (
  value: string | number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string => (value == null ? "—" : formatMoneyValue(value, options));

/**
 * Importe de moneda DESCONOCIDA (`NO_CURRENCY_FORMAT`): 2 decimales, sin símbolo, y
 * "—" si el valor falta. Único punto de esa regla para quien no tiene código de
 * moneda que pasar; con código, `formatMoneyValue(value, moneyFormatFor(codigo))`.
 */
export const formatAmountNoCurrency = (value: string | number | null | undefined): string =>
  formatMoneyValueOrDash(value, NO_CURRENCY_FORMAT);

/**
 * Formatea una CANTIDAD (no dinero) como número plano es-MX, hasta 2 decimales,
 * sin símbolo de moneda. Para campos de existencias que llegan como string
 * decimal del backend ("10.0000"). Comparte `safeParseAmount` con los importes.
 */
export const formatQuantityValue = (value: string | number): string =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 2 }).format(
    safeParseAmount(String(value)),
  );

/**
 * Como `formatQuantityValue` pero conserva la PRECISIÓN COMPLETA de la cantidad
 * (hasta 4 decimales, la resolución con que el inventario mueve existencias),
 * recortando ceros a la derecha ("10.0000" → "10", "10.1256" → "10.1256"). Para
 * vistas donde la cantidad EXACTA trasladada importa (p.ej. el detalle de un
 * traspaso) y redondear a 2 decimales confundiría dos renglones distintos.
 */
export const formatExactQuantityValue = (value: string | number): string =>
  new Intl.NumberFormat("es-MX", { maximumFractionDigits: 4 }).format(
    safeParseAmount(String(value)),
  );
