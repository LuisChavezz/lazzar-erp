import {
  FacturacionIcon,
  CheckCircleIcon,
  ClockIcon,
  TrendingUpIcon,
  ErrorIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { ACCOUNTING_KPIS } from "../mocks/accounting.mock";

// Formato compacto (sin centavos) para los valores monetarios de las tarjetas.
const formatKpi = (value: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);

export const AccountingStats = () => {
  const sobrePresupuesto = ACCOUNTING_KPIS.centrosSobrePresupuesto;
  const haySobregiro = sobrePresupuesto > 0;

  const items: KpiItem[] = [
    {
      label: "Pólizas del Mes",
      value: String(ACCOUNTING_KPIS.polizasDelMes),
      icon: FacturacionIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: `${ACCOUNTING_KPIS.totalPolizas} en el ejercicio`,
      status: "neutral",
    },
    {
      label: "Contabilizadas",
      value: String(ACCOUNTING_KPIS.polizasContabilizadas),
      icon: CheckCircleIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "Registradas",
      status: "positive",
    },
    {
      label: "Borradores Pendientes",
      value: String(ACCOUNTING_KPIS.polizasBorrador),
      icon: ClockIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "Por contabilizar",
      status: "neutral",
    },
    {
      label: "Cargos del Mes",
      value: formatKpi(ACCOUNTING_KPIS.totalCargosDelMes),
      icon: TrendingUpIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "Junio 2026",
      status: "neutral",
    },
    {
      label: "Centros sobre Presupuesto",
      value: String(sobrePresupuesto),
      icon: haySobregiro ? ErrorIcon : CheckCircleIcon,
      iconBgClass: haySobregiro ? "bg-red-50 dark:bg-red-500/10" : "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: haySobregiro ? "text-red-500" : "text-emerald-500",
      trendLabel: haySobregiro ? "Requieren revisión" : "Dentro de presupuesto",
      status: haySobregiro ? "negative" : "positive",
    },
  ];

  return <KpiGrid items={items} />;
};
