import type { Currency } from "../interfaces/currency.interface";

/** Moneda del catálogo con esa PK; `null` si el catálogo no ha cargado o no la trae. */
export const findCurrency = (
  currencies: Currency[] | null | undefined,
  id: number | null | undefined
): Currency | null => currencies?.find((item) => item.id === id) ?? null;

/** Etiqueta de una moneda: "MXN - Peso mexicano". */
export const getCurrencyLabel = (currency: Pick<Currency, "codigo_iso" | "nombre">): string =>
  `${currency.codigo_iso} - ${currency.nombre}`;
