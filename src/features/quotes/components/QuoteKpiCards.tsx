import type { ReactNode } from "react";
import { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import { KpiMutedValue, KpiTaggedBlocks, SEPARATE_CURRENCIES_NOTE } from "@/src/components/KpiCurrency";
import { UNKNOWN_CURRENCY_TAG } from "@/src/components/CurrencyTotalsValue";
import {
  CalendarDaysIcon,
  ClockIcon,
  FacturacionIcon,
  OrdenesIcon,
} from "@/src/components/Icons";
import { formatMoneyValue } from "@/src/utils/formatCurrency";
import { visibleCurrencyEntries } from "@/src/utils/currencyTotals";
import { formatKpiTaggedCurrencyAmount, plural } from "@/src/utils/kpiFormat";
import type { QuoteKpis } from "../interfaces/quote-list.interface";
import {
  getPendingAuthorizationCount,
  getQuoteAmountsExcludingRejected,
  type QuoteCurrencyAmount,
} from "../utils/quoteKpis";
import { QUOTE_RECENT_DAYS } from "../utils/quoteListParams";

/**
 * Tarjetas compactas (`KpiGrid compact`, el diseño de los indicadores de
 * Pedidos, Mesa de Control, Compras y Clientes) de cotizaciones. Leen `kpis/`
 * tal cual; las comparten `QuoteStats` y el dashboard de `/sales`.
 *
 * Cada constructor recibe el estado de SU consulta: sin datos todavía, "—";
 * si nunca cargó, "No disponible" con el motivo en el ⓘ.
 */

/** Lo que una tarjeta necesita saber de la consulta que la alimenta. */
export interface QuoteKpiSource {
  data: QuoteKpis | undefined;
  isInitialError: boolean;
}

const UNAVAILABLE_REASON = "No se pudieron cargar los indicadores de cotizaciones.";
const PLACEHOLDER = "—";

/** Tarjeta de un conteo; en cero se atenúa. */
const countCard = (
  base: Pick<KpiCompactItem, "label" | "icon" | "info">,
  iconClass: string,
  source: QuoteKpiSource,
  count: (kpis: QuoteKpis) => number,
): KpiCompactItem => {
  if (source.isInitialError) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: UNAVAILABLE_REASON };
  }
  if (!source.data) return { ...base, ...KPI_MUTED_ICON, value: PLACEHOLDER, hideProgress: true };
  const value = count(source.data);
  return {
    ...base,
    ...(value > 0 ? { iconClass } : KPI_MUTED_ICON),
    value: value.toLocaleString("es-MX"),
    hideProgress: true,
  };
};

/** Total de cotizaciones visibles (`total`). */
export const buildQuoteTotalCard = (source: QuoteKpiSource): KpiCompactItem =>
  countCard(
    {
      label: "Total de cotizaciones",
      icon: OrdenesIcon,
      info: "Todas las cotizaciones que puedes ver, en cualquier estatus.",
    },
    "text-sky-500",
    source,
    (kpis) => kpis.total,
  );

/** Cotizaciones por autorizar (estatus 2). */
export const buildPendingAuthorizationCard = (source: QuoteKpiSource): KpiCompactItem =>
  countCard(
    {
      label: "Por autorizar",
      icon: ClockIcon,
      info: "Cotizaciones enviadas a revisión que esperan la decisión de Mesa de Control.",
    },
    "text-amber-500",
    source,
    getPendingAuthorizationCount,
  );

/** Cotizaciones creadas en los últimos 30 días, hoy incluido. */
export const buildRecentQuotesCard = (source: QuoteKpiSource): KpiCompactItem =>
  countCard(
    {
      label: `Cotizaciones · ${QUOTE_RECENT_DAYS} días`,
      icon: CalendarDaysIcon,
      info: `Cotizaciones creadas en los últimos ${QUOTE_RECENT_DAYS} días, hoy incluido.`,
    },
    "text-emerald-500",
    source,
    (kpis) => kpis.total,
  );

/** Texto de un importe en su moneda; sin moneda, sin símbolo (EC-600). */
const formatAmount = ({ moneda, monto }: QuoteCurrencyAmount): string =>
  moneda ? formatKpiTaggedCurrencyAmount(monto, moneda) : formatMoneyValue(monto, null);

/**
 * Importe por moneda sin las rechazadas: un bloque por moneda con importe, con
 * su código (o "Sin moneda") y, con más de una, cuántas cotizaciones aporta
 * cada una.
 */
export const buildQuoteAmountCard = (source: QuoteKpiSource): KpiCompactItem => {
  const base = {
    label: "Importe por moneda",
    icon: FacturacionIcon,
    info: `Suma del total de las cotizaciones, sin las rechazadas. ${SEPARATE_CURRENCIES_NOTE}`,
  };
  if (source.isInitialError) {
    return { ...base, ...KPI_MUTED_ICON, value: null, unavailableReason: UNAVAILABLE_REASON };
  }
  if (!source.data) return { ...base, ...KPI_MUTED_ICON, value: PLACEHOLDER, hideProgress: true };
  // Qué monedas se ven, con el criterio de EC-601 (`visibleCurrencyEntries`):
  // las que suman cero se ocultan si otra tiene importe; si todas dan cero
  // queda la única moneda, o ninguna (y entonces un 0 sin símbolo).
  const allAmounts = getQuoteAmountsExcludingRejected(source.data);
  const { visibles: amounts } = visibleCurrencyEntries(allAmounts, (amount) => amount.monto);
  let value: ReactNode;
  if (allAmounts.length === 0) {
    value = <KpiMutedValue>Sin cotizaciones</KpiMutedValue>;
  } else if (amounts.length === 0) {
    value = formatMoneyValue(0, null);
  } else {
    const showCount = amounts.length > 1;
    value = (
      <KpiTaggedBlocks
        blocks={amounts.map((amount) => ({
          key: amount.moneda ?? UNKNOWN_CURRENCY_TAG,
          value: formatAmount(amount),
          tag: amount.moneda ?? UNKNOWN_CURRENCY_TAG,
          detail: showCount
            ? `${amount.cotizaciones} ${plural(amount.cotizaciones, "cotización", "cotizaciones")}`
            : undefined,
        }))}
      />
    );
  }
  return {
    ...base,
    ...(amounts.some((amount) => amount.monto !== 0) ? { iconClass: "text-violet-500" } : KPI_MUTED_ICON),
    value,
    hideProgress: true,
  };
};
