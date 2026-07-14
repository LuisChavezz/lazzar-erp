"use client";

import { CxcIcon, ClockIcon, ErrorIcon, CheckCircleIcon } from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { useCuentasPorCobrar } from "../hooks/useCuentasPorCobrar";
import { computeCxcKpis, startOfTodayUTC } from "../utils/accounts-receivable.utils";

// Formato compacto (sin centavos) para los valores grandes de las tarjetas KPI.
const formatKpi = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

// Etiqueta del mes en curso (p. ej. "Julio 2026"), derivada de "hoy" en UTC para
// mantener el mismo marco que el resto de los cálculos de fecha.
const formatMonthLabel = (todayUTC: number) => {
  const label = new Date(todayUTC).toLocaleDateString("es-MX", {
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

export const AccountsReceivableStats = () => {
  const { cuentas, isLoading, isError, hasLoaded } = useCuentasPorCobrar();

  // Sin datos confiables (cargando o error de carga inicial) no se muestran
  // cifras: un "$0" se leería como un dato real. `computeCxcKpis([])` daría 0.
  const showPlaceholder = isLoading || (isError && !hasLoaded);

  // "Hoy" se calcula UNA sola vez y se pasa a los cálculos, evitando desfaces.
  const today = startOfTodayUTC();
  const kpis = computeCxcKpis(cuentas, today);

  const items: KpiItem[] = [
    {
      label: "Total por Cobrar",
      value: showPlaceholder ? PLACEHOLDER : formatKpi(kpis.totalPorCobrar),
      icon: CxcIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: showPlaceholder ? undefined : "Saldo abierto",
      status: "neutral",
    },
    {
      label: "Vencido",
      value: showPlaceholder ? PLACEHOLDER : formatKpi(kpis.totalVencido),
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
      value: showPlaceholder ? PLACEHOLDER : formatKpi(kpis.porVencer30),
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
      value: showPlaceholder ? PLACEHOLDER : formatKpi(kpis.cobradoEsteMes),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: showPlaceholder ? undefined : formatMonthLabel(today),
      status: "positive",
    },
  ];

  return <KpiGrid items={items} />;
};
