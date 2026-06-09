import { LocationDashboard } from "@/src/features/locations/components/LocationDashboard";

export default function LocationsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitoreo de capacidad, ocupación por zona y detalle de ubicaciones del almacén.
        </p>
      </div>

      <LocationDashboard />
    </div>
  );
}
