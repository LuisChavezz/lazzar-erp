import { sortByMoneda, type CurrencyTotal } from "@/src/utils/currencyTotals";

/**
 * Importes del tablero de rotación (`importe_por_moneda`, nucleo-erp #1109):
 * por fila y en `resumen`, un importe por moneda del pedido que nunca se suma
 * con el de otra.
 *
 * - `{}`: sin venta en el periodo.
 * - `null`: el usuario no tiene permiso de importes de pedido. Es la ÚNICA señal
 *   de permiso (no hay bandera `puede_ver_importes`), así que una clave
 *   ausente se trata igual que `null`: falla cerrado.
 *
 * `importe_vendido` (el total cuando todo es de una moneda) no se usa: vale `0`
 * sin ventas y `null` con varias monedas, así que mezclaría "sin venta", "sin
 * permiso" y "varias monedas".
 */
export type ImportePorMoneda = Record<string, number>;

/** Clave con la que el backend agrupa la venta cuya moneda no tiene código ISO. */
export const SIN_MONEDA_KEY = "S/M";

/**
 * `importe_por_moneda` tal como llegó → diccionario de números, o `null` si no
 * se puede mostrar. Ausente, `null` o algo que no sea un diccionario es `null`
 * (sin permiso). Un importe que no sea un número finito invalida el diccionario
 * entero: mostrar solo una parte daría un total equivocado.
 */
export const normalizeImportePorMoneda = (value: unknown): ImportePorMoneda | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const importes: ImportePorMoneda = {};
  for (const [moneda, raw] of Object.entries(value)) {
    const amount =
      typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
    if (!Number.isFinite(amount)) return null;
    importes[moneda] = amount;
  }
  return importes;
};

/**
 * Diccionario → `CurrencyTotal[]` ordenado por código, con la moneda sin código
 * (`"S/M"` o vacía) como desconocida (`null`, al final y sin símbolo, EC-600).
 */
export const importeCurrencyTotals = (importes: ImportePorMoneda): CurrencyTotal[] =>
  sortByMoneda(
    Object.entries(importes).map(([moneda, total]) => ({
      moneda: moneda.trim() === "" || moneda === SIN_MONEDA_KEY ? null : moneda,
      total,
    })),
  );
