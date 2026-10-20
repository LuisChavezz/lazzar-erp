"use client";

import { CheckCircleIcon, ReceiptIcon } from "@/src/components/Icons";
import KpiGrid, { KPI_MUTED_ICON, type KpiCompactItem } from "@/src/components/KpiGrid";
import {
  KpiMutedValue,
  KpiTaggedBlocks,
  SEPARATE_CURRENCIES_NOTE,
} from "@/src/components/KpiCurrency";
import { useBankAccounts } from "@/src/features/bank-accounts/hooks/useBankAccounts";
import { formatKpiCurrencyAmount } from "@/src/utils/kpiFormat";
import { useFinanceDashboard } from "../hooks/useFinanceDashboard";

interface Moneda {
  id: number;
  codigo: string;
}

type Metric = "monto" | "cantidad";

const PLACEHOLDER = "—";

const PERIOD_NOTE = "Mes en curso hasta hoy (período por defecto del backend). Solo cuenta cobros aplicados.";

/**
 * Monedas distintas entre las cuentas bancarias de la empresa: el cobro se
 * cobra en la moneda de su cuenta, así que son las únicas en que puede haber
 * cobros. Las cuentas sin código de moneda no se pueden etiquetar y se omiten.
 */
const distinctMonedas = (
  accounts: { moneda: number; moneda_codigo: string | null }[],
): Moneda[] => {
  const byId = new Map<number, Moneda>();
  for (const account of accounts) {
    if (account.moneda_codigo && !byId.has(account.moneda)) {
      byId.set(account.moneda, { id: account.moneda, codigo: account.moneda_codigo });
    }
  }
  return [...byId.values()].sort((a, b) => a.codigo.localeCompare(b.codigo));
};

/**
 * Valor de UNA moneda dentro de una tarjeta. Cada bloque pide su propio
 * `dashboard/?moneda_id=`; las dos tarjetas leen la misma llave, así que es una
 * sola petición por moneda. Solo `<span>`: se pinta dentro del `<h3>` de
 * `KpiGrid`.
 */
function CurrencyBlock({ moneda, metric }: { moneda: Moneda; metric: Metric }) {
  const { dashboard, isLoading, isInitialError } = useFinanceDashboard({ moneda_id: moneda.id });

  let value: string;
  if (isInitialError) value = "No disponible";
  else if (isLoading || !dashboard) value = PLACEHOLDER;
  else if (metric === "monto") {
    value = formatKpiCurrencyAmount(dashboard.cobros_periodo.monto_total, moneda.codigo);
  } else {
    value = String(dashboard.cobros_periodo.cantidad);
  }

  return <KpiTaggedBlocks blocks={[{ key: moneda.codigo, value, tag: moneda.codigo }]} />;
}

function CurrencyBlocks({ monedas, metric }: { monedas: Moneda[]; metric: Metric }) {
  return (
    <span className="block space-y-1.5">
      {monedas.map((moneda) => (
        <CurrencyBlock key={moneda.id} moneda={moneda} metric={metric} />
      ))}
    </span>
  );
}

/**
 * Indicadores de cobros del período, POR MONEDA: una consulta al dashboard por
 * cada moneda de las cuentas bancarias, nunca una suma de monedas mezcladas.
 *
 * Es independiente del listado: su carga o su error no tocan la tabla ni su
 * toolbar, y un fallo de una moneda solo marca "No disponible" en esa moneda.
 */
export function CollectionStats() {
  const { bankAccounts, hasLoaded, isLoading, isError } = useBankAccounts();
  const monedas = distinctMonedas(bankAccounts);

  const catalogUnavailable = isError && !hasLoaded;

  const valueFor = (metric: Metric) => {
    if (catalogUnavailable) return <KpiMutedValue>No disponible</KpiMutedValue>;
    if (isLoading) return PLACEHOLDER;
    if (monedas.length === 0) return <KpiMutedValue>Sin cuentas bancarias</KpiMutedValue>;
    return <CurrencyBlocks monedas={monedas} metric={metric} />;
  };

  const items: KpiCompactItem[] = [
    {
      label: "Cobrado en el período",
      value: valueFor("monto"),
      icon: CheckCircleIcon,
      ...(monedas.length > 0 ? { iconClass: "text-emerald-500" } : KPI_MUTED_ICON),
      info: `${PERIOD_NOTE} ${SEPARATE_CURRENCIES_NOTE}`,
      hideProgress: true,
    },
    {
      label: "Cobros aplicados",
      value: valueFor("cantidad"),
      icon: ReceiptIcon,
      ...(monedas.length > 0 ? { iconClass: "text-sky-500" } : KPI_MUTED_ICON),
      info: `${PERIOD_NOTE} El conteo va por la moneda de la cuenta bancaria de cada cobro.`,
      hideProgress: true,
    },
  ];

  return <KpiGrid compact items={items} />;
}
