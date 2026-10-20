import type { CuentaBancaria } from "@/src/features/bank-accounts/interfaces/bank-account.interface";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * Índice de CxC por id, armado UNA vez sobre el listado completo de
 * `useCuentasPorCobrar()` (sin parámetros: trae también las `Pagada` y
 * `Cancelada`, que es justo a donde apuntan las líneas de cobros ya aplicados).
 * Resuelve folio de factura, moneda y saldo de cada línea sin una petición por
 * renglón.
 */
export const buildCxcIndex = (cuentas: CuentaPorCobrar[]): Map<number, CuentaPorCobrar> =>
  new Map(cuentas.map((cuenta) => [cuenta.id, cuenta]));

/** Índice de cuentas bancarias por id, para resolver la moneda de cada cobro. */
export const buildBankAccountIndex = (accounts: CuentaBancaria[]): Map<number, CuentaBancaria> =>
  new Map(accounts.map((account) => [account.id, account]));

/**
 * Moneda del cobro: la de su cuenta bancaria. El cobro no tiene moneda propia y
 * el backend no obliga a que coincida con la de las facturas aplicadas.
 *
 * `null` si la cuenta no se puede resolver (catálogo sin cargar, o la cuenta no
 * viene en él) o no trae código: en ese caso el importe se muestra SIN símbolo
 * en vez de adivinar una moneda.
 */
export const resolveCobroMoneda = (
  cobro: Pick<Cobro, "cuenta_bancaria">,
  bankAccounts: Map<number, CuentaBancaria>,
): string | null => bankAccounts.get(cobro.cuenta_bancaria)?.moneda_codigo ?? null;

/**
 * Monedas de las CxC aplicadas que NO coinciden con la del cobro. Solo cuenta
 * las líneas cuya CxC se pudo resolver; sin moneda del cobro no hay contra qué
 * comparar y devuelve `[]`.
 */
export const findMismatchedMonedas = (
  cobro: Pick<Cobro, "cobro_detalles">,
  moneda: string | null,
  cxcIndex: Map<number, CuentaPorCobrar>,
): string[] => {
  if (moneda === null) return [];
  const mismatched = new Set<string>();
  for (const linea of cobro.cobro_detalles) {
    const lineMoneda = cxcIndex.get(linea.cxc)?.moneda_codigo;
    if (lineMoneda && lineMoneda !== moneda) mismatched.add(lineMoneda);
  }
  return [...mismatched];
};

/**
 * Importe con el símbolo de `moneda`, o sin símbolo si es `null`. `narrowSymbol`:
 * es-MX pinta USD como "USD 1,234.00", y la UI ya muestra el código aparte.
 */
export const formatCobroAmount = (value: string, moneda: string | null): string =>
  moneda === null
    ? formatMoneyValue(value, NO_CURRENCY_FORMAT)
    : formatMoneyValue(value, { currency: moneda, currencyDisplay: "narrowSymbol" });
