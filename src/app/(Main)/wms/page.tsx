import KpiGrid, { KpiItem } from "@/src/components/KpiGrid";
import {
  ExistenciasIcon,
  RecepcionesIcon,
  EmbarquesIcon,
  SettingsIcon,
} from "@/src/components/Icons";
import { WmsViews } from "@/src/features/wms/components/WmsViews";

export default function WmsPage() {
  const items: KpiItem[] = [
    {
      label: "Existencias",
      value: "18,430",
      icon: ExistenciasIcon,
      iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
      iconClass: "text-sky-500",
      trendLabel: "+4.8%",
      status: "positive",
      subLabel: "Total de unidades",
      progress: 72,
    },
    {
      label: "Entradas",
      value: "1,265",
      icon: RecepcionesIcon,
      iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-500",
      trendLabel: "+132",
      status: "positive",
      subLabel: "Últimos 30 días",
      progress: 64,
    },
    {
      label: "Salidas",
      value: "1,198",
      icon: EmbarquesIcon,
      iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-500",
      trendLabel: "-2.1%",
      status: "negative",
      subLabel: "Últimos 30 días",
      progress: 48,
    },
    {
      label: "Ajustes",
      value: "87",
      icon: SettingsIcon,
      iconBgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-500",
      trendLabel: "+9",
      status: "neutral",
      subLabel: "Correcciones de inventario",
      progress: 35,
    },
  ];

  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Vista general de inventarios y movimientos operativos de almacén.
        </p>
      </div>
      <KpiGrid items={items} />
      <WmsViews />
    </div>
  );
}
