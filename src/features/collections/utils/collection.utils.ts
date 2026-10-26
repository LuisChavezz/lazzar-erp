import type { CuentaBancaria } from "@/src/features/bank-accounts/interfaces/bank-account.interface";
import type { CuentaPorCobrar } from "@/src/features/accounts-receivable/interfaces/accounts-receivable.interface";
import { formatMoneyValue, NO_CURRENCY_FORMAT } from "@/src/utils/formatCurrency";
import { formatKpiCurrencyAmount } from "@/src/utils/kpiFormat";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * Renglón del listado: el cobro tal cual más el CÓDIGO de su moneda ya resuelto
 * (el de su cuenta bancaria; `moneda` del cobro es solo la FK). Se calcula UNA
 * vez al armar las filas, no en cada celda.
 */
export interface CobroRow extends Cobro {
  moneda_codigo: string | null;
  /**
   * ¿Su cuenta bancaria sigue activa? `null` si el catálogo no la trae (aún sin
   * cargar). Un borrador con la cuenta desactivada no se puede aplicar: el
   * backend solo acepta cuentas activas en `cuenta_bancaria`.
   */
  cuenta_bancaria_activa: boolean | null;
}

/**
 * Índice de CxC por id, armado UNA vez sobre el listado completo de
 * `useCuentasPorCobrar()` (sin parámetros: trae también las `Pagada` y
 * `Cancelada`, que es justo a donde apuntan las líneas de cobros ya aplicados).
 * Resuelve folio de factura, moneda y saldo de cada línea sin una petición por
 * renglón.
 */
export const buildCxcIndex = (cuentas: CuentaPorCobrar[]): Map<number, CuentaPorCobrar> =>
  new Map(cuentas.map((cuenta) => [cuenta.id, cuenta]));

/**
 * Identificador visible del cobro: su `folio` de la serie `COBROS`, o `#id`
 * cuando no tiene (ver `Cobro.folio`).
 */
export const cobroLabel = (cobro: Pick<Cobro, "id" | "folio">): string => cobro.folio || `#${cobro.id}`;

/** Índice de cuentas bancarias por id, para resolver la moneda de cada cobro. */
export const buildBankAccountIndex = (accounts: CuentaBancaria[]): Map<number, CuentaBancaria> =>
  new Map(accounts.map((account) => [account.id, account]));

/**
 * Código de la moneda del cobro: el de su cuenta bancaria (el backend fija
 * `moneda` del cobro con la de la cuenta). Al aplicar, el backend exige que cada
 * factura esté en esa moneda; los cobros previos a esa regla pueden mezclarlas.
 *
 * `null` si la cuenta no se puede resolver (catálogo sin cargar, o la cuenta no
 * viene en él) o no trae código: en ese caso el importe se muestra SIN símbolo
 * en vez de adivinar una moneda.
 */
export const resolveCobroMoneda = (
  cobro: Pick<Cobro, "cuenta_bancaria">,
  bankAccounts: Map<number, CuentaBancaria>,
): string | null => bankAccounts.get(cobro.cuenta_bancaria)?.moneda_codigo || null;

/** Mapea los cobros a filas de tabla con su moneda resuelta (ver `resolveCobroMoneda`). */
export const mapCobrosToRows = (cobros: Cobro[], bankAccounts: CuentaBancaria[]): CobroRow[] => {
  const index = buildBankAccountIndex(bankAccounts);
  return cobros.map((cobro) => ({
    ...cobro,
    moneda_codigo: resolveCobroMoneda(cobro, index),
    cuenta_bancaria_activa: index.get(cobro.cuenta_bancaria)?.activo ?? null,
  }));
};

/**
 * ¿La línea está en otra moneda que el cobro? Solo con AMBAS monedas conocidas
 * (un código vacío cuenta como desconocido). Regla única para el aviso del
 * diálogo y la marca de cada línea.
 */
export const isLineMonedaMismatch = (
  moneda: string | null,
  cxc: Pick<CuentaPorCobrar, "moneda_codigo"> | undefined,
): boolean => {
  const lineMoneda = cxc?.moneda_codigo || null;
  return moneda !== null && lineMoneda !== null && lineMoneda !== moneda;
};

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
  const mismatched = new Set<string>();
  for (const linea of cobro.cobro_detalles) {
    const cxc = cxcIndex.get(linea.cxc);
    if (cxc && isLineMonedaMismatch(moneda, cxc)) mismatched.add(cxc.moneda_codigo);
  }
  return [...mismatched];
};

/**
 * Importe con el símbolo de `moneda` (`formatKpiCurrencyAmount`, el mismo formato
 * que los indicadores), o sin símbolo si es `null`.
 */
export const formatCobroAmount = (value: string, moneda: string | null): string =>
  moneda === null ? formatMoneyValue(value, NO_CURRENCY_FORMAT) : formatKpiCurrencyAmount(value, moneda);
