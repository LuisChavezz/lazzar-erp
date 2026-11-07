import { createCurrencyTotals } from "@/src/utils/currencyTotals";
import { safeParseAmount } from "@/src/utils/formatCurrency";
import type { QuoteKpis } from "../interfaces/quote-list.interface";
import { PENDING_AUTHORIZATION_QUOTE_STATUS, REJECTED_QUOTE_STATUS } from "./quoteStatusRules";

/**
 * Lecturas de `kpis/` para las tarjetas de cotizaciones (QuoteStats y el
 * dashboard de `/sales`). Puras: todo el cálculo es del backend salvo la
 * suma por moneda sin las rechazadas, que se hace en centavos enteros.
 */

/** Conteo de un estatus del catálogo; 0 si el bloque no viene. */
export const getQuoteKpiStatusCount = (kpis: QuoteKpis, estatus: number): number =>
  kpis.por_estatus.find((block) => block.estatus === estatus)?.total ?? 0;

/** Cotizaciones "Por autorizar" (estatus 2). */
export const getPendingAuthorizationCount = (kpis: QuoteKpis): number =>
  getQuoteKpiStatusCount(kpis, PENDING_AUTHORIZATION_QUOTE_STATUS);

/** Importe y conteo de UNA moneda (`moneda: null` = sin moneda). */
export interface QuoteCurrencyAmount {
  moneda: string | null;
  /** Suma de `gran_total`, con 2 decimales exactos (sumada en centavos). */
  monto: number;
  /** Cotizaciones que aportan a ese importe. */
  cotizaciones: number;
}

/**
 * Importe por moneda de las cotizaciones SIN contar las rechazadas: la suma de
 * `por_estatus[].por_moneda` de todos los estatus salvo el 4, agrupada por
 * código y ordenada por código (sin moneda al final). Importes de monedas
 * distintas nunca se suman entre sí. Un estatus fuera del catálogo no trae
 * bloque y no entra.
 */
export const getQuoteAmountsExcludingRejected = (kpis: QuoteKpis): QuoteCurrencyAmount[] => {
  // Importes con el acumulador de EC-601 (centavos enteros, orden por código);
  // el conteo por moneda va aparte: `createCurrencyTotals` solo suma importes.
  const totals = createCurrencyTotals();
  const counts = new Map<string | null, number>();
  for (const block of kpis.por_estatus) {
    if (block.estatus === REJECTED_QUOTE_STATUS) continue;
    for (const entry of block.por_moneda) {
      totals.add(entry.moneda, safeParseAmount(entry.gran_total));
      counts.set(entry.moneda, (counts.get(entry.moneda) ?? 0) + entry.total);
    }
  }
  return totals.list().map(({ moneda, total }) => ({
    moneda,
    monto: total,
    cotizaciones: counts.get(moneda) ?? 0,
  }));
};
