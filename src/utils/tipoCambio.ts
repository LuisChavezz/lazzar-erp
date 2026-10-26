import { normalizeCapturedDecimal } from "./decimal";

/**
 * Moneda local: la única en la que el backend no pide tipo de cambio (lo fija
 * en 1 en cobros y lo ignora en facturas).
 */
export const LOCAL_CURRENCY = "MXN";

/**
 * ¿Esta moneda pide tipo de cambio? Toda moneda distinta de MXN, comparada como
 * el backend (`codigo_iso` en mayúsculas); un código vacío cuenta como "no
 * MXN". `null` = todavía no hay moneda (no elegida o desconocida): no se pide.
 * Fuente única para cobros, emisión de facturas y facturas pendientes de cobro.
 */
export const requiresTipoCambio = (codigoIso: string | null): boolean =>
  codigoIso !== null && codigoIso.trim().toUpperCase() !== LOCAL_CURRENCY;

/**
 * `tipo_cambio` es `DecimalField(max_digits=18, decimal_places=6)` en cobros y
 * en facturas: hasta 12 enteros y 6 decimales.
 */
const TIPO_CAMBIO_REGEX = /^\d{1,12}(\.\d{1,6})?$/;

/**
 * Error de un tipo de cambio CAPTURADO (MXN por unidad de `moneda`), o `null`
 * si es válido: obligatorio, con hasta 6 decimales y mayor a 0
 * (`min_value=0.000001` en el backend). Compartido por los formularios de
 * cobros y de emisión de facturas; cada uno decide cuándo lo pide.
 */
export const getTipoCambioError = (captured: string, moneda: string): string | null => {
  const tipoCambio = normalizeCapturedDecimal(captured);
  if (!tipoCambio) return `Indica el tipo de cambio (MXN por ${moneda})`;
  if (!TIPO_CAMBIO_REGEX.test(tipoCambio) || Number(tipoCambio) <= 0) {
    return "Tipo de cambio inválido: debe ser mayor a 0, con hasta 6 decimales";
  }
  return null;
};
