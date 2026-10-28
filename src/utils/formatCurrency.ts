/**
 * Opciones que quien llama puede ajustar sobre el formato de un importe:
 * decimales, `currencyDisplay`, `signDisplay`… Nunca `currency` ni `style`: la
 * moneda es el parámetro `monedaCodigo`, así no hay forma de colar una por
 * defecto (EC-606).
 */
export type MoneyFormatOverrides = Omit<Intl.NumberFormatOptions, "currency" | "style">;

/**
 * Formato de un importe de moneda DESCONOCIDA: número con 2 decimales y sin
 * símbolo — un "$" sobre un importe en otra moneda (o en varias mezcladas)
 * diría algo falso.
 */
const NO_CURRENCY_FORMAT: Intl.NumberFormatOptions = {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Opciones de `Intl` para un importe en la moneda `monedaCodigo` (código ISO
 * del registro), SIEMPRE con 2 decimales: el backend manda los importes con 2, y
 * los decimales ISO por defecto de `Intl` redondearían, p. ej., un JPY a enteros.
 * Sin código, sin símbolo (`NO_CURRENCY_FORMAT`).
 *
 * `overrides` se aplica encima, con o sin moneda — p. ej.
 * `{ maximumFractionDigits: 0 }` para las tarjetas compactas o
 * `currencyDisplay` —. Un mínimo sin máximo sube el máximo a ese mínimo; un
 * máximo por debajo de 2 baja el mínimo a ese máximo.
 */
const moneyFormatOptions = (
  monedaCodigo: string | null,
  overrides?: MoneyFormatOverrides,
): Intl.NumberFormatOptions => {
  const base: Intl.NumberFormatOptions = monedaCodigo
    ? { style: "currency", currency: monedaCodigo, minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : NO_CURRENCY_FORMAT;
  if (!overrides) return base;
  // Un objeto de tipo más amplio (`Intl.NumberFormatOptions`) es asignable a
  // `MoneyFormatOverrides`: se descartan `currency` y `style` también en tiempo
  // de ejecución para que ningún override reintroduzca una moneda.
  const safe: Intl.NumberFormatOptions = { ...overrides };
  delete safe.currency;
  delete safe.style;
  // Un mínimo pedido por encima de 2 sube el máximo (no se recorta en silencio);
  // un máximo pedido por debajo de 2 baja el mínimo.
  const maximumFractionDigits =
    overrides.maximumFractionDigits ?? Math.max(2, overrides.minimumFractionDigits ?? 2);
  return {
    ...base,
    ...safe,
    minimumFractionDigits: Math.min(overrides.minimumFractionDigits ?? 2, maximumFractionDigits),
    maximumFractionDigits,
  };
};

/**
 * Importe en la moneda `monedaCodigo` (código ISO del registro, p. ej. "USD"),
 * con 2 decimales. La moneda es OBLIGATORIA (EC-606): `null` es la elección
 * explícita de "sin símbolo" para un importe cuya moneda no se conoce, nunca
 * pesos por defecto. Para un importe que legítimamente es MXN, `formatMxn`.
 *
 * Un código que `Intl` no reconozca (p. ej. un nombre de moneda, "Peso
 * Mexicano") se pinta sin símbolo, con los decimales pedidos, en vez de romper
 * el render.
 */
export const formatCurrency = (
  value: number,
  monedaCodigo: string | null,
  overrides?: MoneyFormatOverrides,
): string => {
  const options = moneyFormatOptions(monedaCodigo, overrides);
  try {
    return new Intl.NumberFormat("es-MX", options).format(value);
  } catch {
    const rest: Intl.NumberFormatOptions = { ...options };
    delete rest.currency;
    delete rest.style;
    return new Intl.NumberFormat("es-MX", rest).format(value);
  }
};

/**
 * ¿`Intl` tiene un símbolo propio para `monedaCodigo` (es-MX, `narrowSymbol`)?
 * Para los códigos sin símbolo (XTS, monedas privadas como QXA) `Intl` imprime
 * el propio código: donde la UI ya muestra el código al lado, el importe va sin
 * símbolo para no repetirlo ("XTS 12 XTS"). Un código que `Intl` rechaza
 * tampoco tiene símbolo (`formatCurrency` ya lo pinta sin él).
 */
export const currencyHasOwnSymbol = (monedaCodigo: string): boolean => {
  // La respuesta es fija por código: se calcula una vez (construir un
  // `Intl.NumberFormat` es caro y esto corre por cada bloque en cada render).
  const cached = OWN_SYMBOL_CACHE.get(monedaCodigo);
  if (cached !== undefined) return cached;
  let hasOwn: boolean;
  try {
    const symbol = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: monedaCodigo,
      currencyDisplay: "narrowSymbol",
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value;
    hasOwn = symbol !== undefined && symbol.toUpperCase() !== monedaCodigo.toUpperCase();
  } catch {
    hasOwn = false;
  }
  OWN_SYMBOL_CACHE.set(monedaCodigo, hasOwn);
  return hasOwn;
};

const OWN_SYMBOL_CACHE = new Map<string, boolean>();

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
 * del backend, que llegan como string (o, en algunos renglones, number). Misma
 * regla de moneda: `monedaCodigo` obligatorio, `null` = sin símbolo.
 */
export const formatMoneyValue = (
  value: string | number,
  monedaCodigo: string | null,
  overrides?: MoneyFormatOverrides,
): string => formatCurrency(safeParseAmount(String(value)), monedaCodigo, overrides);

/**
 * Como `formatMoneyValue` pero devuelve "—" cuando el valor es `null`/
 * `undefined`, en vez de un engañoso "0.00". Para los campos financieros que
 * el backend ELIMINA de la respuesta (filtro de contabilidad de pedidos y de
 * órdenes de compra) según el rol del usuario: un importe ausente no es cero,
 * es "no visible".
 */
export const formatMoneyValueOrDash = (
  value: string | number | null | undefined,
  monedaCodigo: string | null,
  overrides?: MoneyFormatOverrides,
): string => (value == null ? "—" : formatMoneyValue(value, monedaCodigo, overrides));

/**
 * Importe de moneda DESCONOCIDA: 2 decimales, sin símbolo, y "—" si el valor
 * falta. Atajo de `formatMoneyValueOrDash(value, null)`.
 */
export const formatAmountNoCurrency = (value: string | number | null | undefined): string =>
  formatMoneyValueOrDash(value, null);

/**
 * Importe que legítimamente es PESOS MEXICANOS ("$1,234.50"), p. ej. los de RH
 * (la LFT, art. 101, exige pagar el salario en moneda de curso legal). Único
 * punto donde el código acepta MXN sin leerlo de un registro: así cada uso
 * queda a la vista. "—" si el valor falta.
 */
export const formatMxn = (
  value: string | number | null | undefined,
  overrides?: MoneyFormatOverrides,
): string => formatMoneyValueOrDash(value, "MXN", overrides);

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
