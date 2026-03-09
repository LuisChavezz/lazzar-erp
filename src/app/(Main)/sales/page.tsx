import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import {
  ClientesIcon,
  TrendingUpIcon,
  PedidosIcon,
  OrdenesIcon,
} from "@/src/components/Icons";
import { SalesPipelines } from "@/src/features/sales/components/SalesPipelines";
import { QuickActions } from "@/src/features/sales/components/QuickActions";

export default function SalesPage() {

  const items: KpiItem[] = [
    {
      label: "Clientes Activos",
      value: "482",
      icon: ClientesIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "+6.1%",
      status: "positive",
    },
    {
      label: "Nuevos este mes",
      value: "64",
      icon: TrendingUpIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "+18",
      status: "positive",
    },
    {
      label: "Pedidos del mes",
      value: "128",
      icon: PedidosIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "+9.4%",
      status: "positive",
    },
    {
      label: "Pedidos críticos",
      value: "9",
      icon: OrdenesIcon,
      iconBgClass: "bg-rose-50 dark:bg-rose-500/10",
      iconClass: "text-rose-500",
      trendLabel: "+3",
      status: "negative",
    },
  ]

  return (
    <div className="w-full space-y-8">
      <KpiGrid items={items} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SalesPipelines />
        </div>
        <QuickActions />
      </div>
    </div>
  );
}
