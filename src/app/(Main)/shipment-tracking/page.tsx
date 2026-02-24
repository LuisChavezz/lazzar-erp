import { ShipmentTrackingStats } from "@/src/features/shipment-tracking/components/ShipmentTrackingStats";
import { ShipmentTrackingList } from "@/src/features/shipment-tracking/components/ShipmentTrackingList";

export default function ShipmentTrackingPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitoreo en tiempo real de guías, transportistas y rutas de entrega.
        </p>
      </div>

      <ShipmentTrackingStats />

      <div className="space-y-6">
        <ShipmentTrackingList />
      </div>
    </div>
  );
}
