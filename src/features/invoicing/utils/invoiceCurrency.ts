/**
 * Moneda local: la única en la que el backend NO pide tipo de cambio
 * (`Factura.tipo_cambio_mxn()` usa 1 y el CFDI no lleva `CurrencyExchangeRate`).
 */
export const INVOICE_LOCAL_CURRENCY = "MXN";

/**
 * Código ISO de la moneda de la factura (`moneda_nombre` del retrieve y del
 * listado, que es `moneda.codigo_iso`), normalizado como lo compara el backend.
 */
export const invoiceCurrencyCode = (invoice: { moneda_nombre: string | null }): string =>
  (invoice.moneda_nombre ?? "").trim().toUpperCase();

/**
 * ¿La factura necesita tipo de cambio? Toda moneda distinta de MXN, con la
 * misma comparación que el backend: un código vacío también cuenta como "no
 * MXN" (el backend la trataría igual y exigiría el tipo de cambio).
 */
export const requiresInvoiceTipoCambio = (invoice: { moneda_nombre: string | null }): boolean =>
  invoiceCurrencyCode(invoice) !== INVOICE_LOCAL_CURRENCY;

/**
 * ¿Falta el tipo de cambio? Fuera de MXN y sin capturar: así no se puede emitir
 * ni timbrar.
 */
export const isInvoiceTipoCambioMissing = (invoice: {
  moneda_nombre: string | null;
  tipo_cambio: string | null;
}): boolean => requiresInvoiceTipoCambio(invoice) && invoice.tipo_cambio === null;

/**
 * Tipo de cambio para leer: el string de 6 decimales del backend ("18.250000")
 * sin los ceros que sobran, con al menos 2 decimales ("18.25", "17.123456").
 */
export const formatInvoiceTipoCambio = (tipoCambio: string): string => {
  const [integer, fraction = ""] = tipoCambio.trim().split(".");
  return `${integer}.${fraction.replace(/0+$/, "").padEnd(2, "0")}`;
};

/**
 * Forma canónica de un decimal sin signo: sin ceros a la izquierda ni a la
 * derecha que sobren ("018.250000" → "18.25", "18.000000" → "18"). Compara
 * como texto, sin pasar por `Number`, para no perder los 18 dígitos del campo.
 */
const canonicalDecimal = (value: string): string => {
  const [integer, fraction = ""] = value.trim().split(".");
  const trimmed = fraction.replace(/0+$/, "");
  const int = integer.replace(/^0+(?=\d)/, "") || "0";
  return trimmed ? `${int}.${trimmed}` : int;
};

/**
 * El tipo de cambio guardado como valor inicial de un campo de captura:
 * "18.250000" → "18.25", "18.000000" → "18". Vacío si no hay.
 */
export const tipoCambioInputValue = (tipoCambio: string | null): string =>
  tipoCambio === null ? "" : canonicalDecimal(tipoCambio);

/** ¿Los dos tipos de cambio son el mismo valor? ("18.25" y "18.250000" lo son). */
export const isSameTipoCambio = (a: string, b: string | null): boolean =>
  b !== null && canonicalDecimal(a) === canonicalDecimal(b);
