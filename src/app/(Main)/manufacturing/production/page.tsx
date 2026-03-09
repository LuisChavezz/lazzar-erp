import { ProductionStats } from "@/src/features/production/components/ProductionStats";
import { ProductionList } from "@/src/features/production/components/ProductionList";

export default function ProductionPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Control y seguimiento de órdenes de producción.
        </p>
      </div>

      {/* Stats */}
      <ProductionStats />

      {/* Content */}
      <div className="space-y-6">
        <ProductionList />
      </div>
    </div>
  );
}
