"use client";

import { CxcIcon, ClockIcon, ErrorIcon, CheckCircleIcon } from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { CurrencyTotalsValue } from "@/src/components/CurrencyTotalsValue";
import type { CurrencyTotal } from "@/src/utils/currencyTotals";
import { useCuentasPorCobrar } from "../hooks/useCuentasPorCobrar";
import { computeCxcKpis } from "../utils/accounts-receivable.utils";

// Valor de una tarjeta: un importe por moneda (EC-601). Con una sola moneda,
// formato compacto (sin centavos) en esa moneda, como antes.
const kpiValue = (totals: CurrencyTotal[]) => (
  <CurrencyTotalsValue totals={totals} options={{ maximumFractionDigits: 0 }} />
);

// Etiqueta del mes en curso (p. ej. "Julio 2026"), derivada de `today`
// ("YYYY-MM-DD", el día del backend). Se lee como medianoche UTC y se formatea en
// UTC para no cambiar de mes según la zona del navegador.
const formatMonthLabel = (today: string) => {
  const label = new Date(Date.parse(today)).toLocaleDateString("es-MX", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// Mientras carga —o si la carga inicial falló— mostramos un marcador en lugar
// de ceros que parecerían reales (mismo criterio que `InvoiceStats`). El detalle
// del error se muestra en la lista de abajo (`ErrorState`), así que aquí basta
// con no fabricar un "$0" falso.
const PLACEHOLDER = "—";

/** `today`: el día del backend que comparte `AccountsReceivableView` con la lista. */
export const AccountsReceivableStats = ({ today }: { today: string }) => {
  const { cuentas, isLoading, isError, hasLoaded } = useCuentasPorCobrar();

  // Sin datos confiables (cargando o error de carga inicial) no se muestran
  // cifras: un "$0" se leería como un dato real. `computeCxcKpis([])` no traería monedas (0 sin símbolo).
  const showPlaceholder = isLoading || (isError && !hasLoaded);

  const kpis = computeCxcKpis(cuentas, today);

  const items: KpiItem[] = [
    {
      label: "Total por Cobrar",
      value: showPlaceholder ? PLACEHOLDER : kpiValue(kpis.totalPorCobrar),
      icon: CxcIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: showPlaceholder ? undefined : "Saldo abierto",
      status: "neutral",
    },
    {
      label: "Vencido",
      value: showPlaceholder ? PLACEHOLDER : kpiValue(kpis.totalVencido),
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: showPlaceholder
        ? undefined
        : `${kpis.cuentasVencidas} ${kpis.cuentasVencidas === 1 ? "cuenta" : "cuentas"}`,
      status: "negative",
    },
    {
      label: "Por Vencer (30 días)",
      value: showPlaceholder ? PLACEHOLDER : kpiValue(kpis.porVencer30),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: showPlaceholder ? undefined : "Próximos vencimientos",
      status: "neutral",
    },
    {
      label: "Cobrado este Mes",
      // Cifra aproximada: la lista no trae historial de pagos, se estima con
      // `total − saldo` de las cuentas cuyo último pago cae en el mes en curso.
      subLabel: "Aprox. (último pago)",
      value: showPlaceholder ? PLACEHOLDER : kpiValue(kpis.cobradoEsteMes),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: showPlaceholder ? undefined : formatMonthLabel(today),
      status: "positive",
    },
  ];

  return <KpiGrid items={items} />;
};
