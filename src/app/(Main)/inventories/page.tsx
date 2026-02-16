import { InventoryStats } from "@/src/features/inventory/components/InventoryStats";
import { InventoryList } from "@/src/features/inventory/components/InventoryList";

export default function InventoryPage() {
  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Gestión de existencias y movimientos de almacén.
        </p>
      </div>

      {/* Stats */}
      <InventoryStats />

      {/* Content */}
      <div className="space-y-6">
        <InventoryList />
      </div>
    </div>
  );
}
