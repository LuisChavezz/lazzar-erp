import { PriceListStats } from "@/src/features/price-lists/components/PriceListStats";
import { PriceListList } from "@/src/features/price-lists/components/PriceListList";

export default function PriceListsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Control y gestión de listas de precios, márgenes y monedas por mercado.
        </p>
      </div>

      <PriceListStats />

      <div className="space-y-6">
        <PriceListList />
      </div>
    </div>
  );
}
