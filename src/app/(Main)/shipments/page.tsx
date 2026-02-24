import { ShipmentsStats } from "@/src/features/shipments/components/ShipmentsStats";
import { ShipmentsList } from "@/src/features/shipments/components/ShipmentsList";

export default function ShipmentsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Coordinación de embarques, rutas y entregas programadas.
        </p>
      </div>

      <ShipmentsStats />

      <div className="space-y-6">
        <ShipmentsList />
      </div>
    </div>
  );
}
