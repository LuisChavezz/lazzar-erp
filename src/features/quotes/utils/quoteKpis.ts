import { createCurrencyTotals, type CurrencyTotal } from "@/src/utils/currencyTotals";
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

/**
 * Importe por moneda de las cotizaciones SIN contar las rechazadas: la suma de
 * `por_estatus[].por_moneda` de todos los estatus salvo el 4, agrupada por
 * código (`null` = sin moneda, al final). Importes de monedas distintas nunca
 * se suman entre sí. Un estatus fuera del catálogo no trae bloque y no entra.
 */
export const getQuoteAmountsExcludingRejected = (kpis: QuoteKpis): CurrencyTotal[] => {
  const totals = createCurrencyTotals();
  for (const block of kpis.por_estatus) {
    if (block.estatus === REJECTED_QUOTE_STATUS) continue;
    for (const moneda of block.por_moneda) {
      totals.add(moneda.moneda, safeParseAmount(moneda.gran_total));
    }
  }
  return totals.list();
};

/** Cotizaciones que entran en el importe (todas menos las rechazadas). */
export const getQuoteCountExcludingRejected = (kpis: QuoteKpis): number =>
  kpis.por_estatus
    .filter((block) => block.estatus !== REJECTED_QUOTE_STATUS)
    .reduce((sum, block) => sum + block.total, 0);
