import { ShipmentStats } from "@/src/features/shipments/components/ShipmentStats";
import { ShipmentList } from "@/src/features/shipments/components/ShipmentList";

export default function ShipmentsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Coordinación de embarques, rutas y entregas programadas.
        </p>
      </div>

      <ShipmentStats />

      <div className="space-y-6">
        <ShipmentList />
      </div>
    </div>
  );
}
