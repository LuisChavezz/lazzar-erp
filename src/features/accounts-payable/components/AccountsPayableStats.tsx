import { CxpIcon, ClockIcon, ErrorIcon, CheckCircleIcon } from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { CXP_KPIS } from "../mocks/accounts-payable.mock";

// Formato compacto (sin centavos) para los valores grandes de las tarjetas KPI.
const formatKpi = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

export const AccountsPayableStats = () => {
  const items: KpiItem[] = [
    {
      label: "Total por Pagar",
      value: formatKpi(CXP_KPIS.totalPorPagar),
      icon: CxpIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Saldo abierto",
      status: "neutral",
    },
    {
      label: "Vencido",
      value: formatKpi(CXP_KPIS.totalVencido),
      icon: ErrorIcon,
      iconBgClass: "bg-red-50 dark:bg-red-500/10",
      iconClass: "text-red-500",
      trendLabel: `${CXP_KPIS.cuentasVencidas} cuentas`,
      status: "negative",
    },
    {
      label: "Por Vencer (30 días)",
      value: formatKpi(CXP_KPIS.porVencer30),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Próximos vencimientos",
      status: "neutral",
    },
    {
      label: "Pagado este Mes",
      value: formatKpi(CXP_KPIS.pagadoEsteMes),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Junio 2026",
      status: "positive",
    },
  ];

  return <KpiGrid items={items} />;
};
