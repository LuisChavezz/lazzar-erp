import { LocationDashboard } from "@/src/features/locations/components/LocationDashboard";
import { generarLocationDashboardData } from "@/src/features/locations/mocks/locations-dashboard.mock";

// Se genera una sola vez por proceso (en el build, al ser página estática): el
// generador avanza el PRNG sembrado, así que llamarlo en cada render daría datos
// distintos por petición en desarrollo.
const LOCATION_DASHBOARD_DATA = generarLocationDashboardData();

export default function LocationsPage() {
  return (
    <div className="w-full space-y-8">
      <div>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Monitoreo de capacidad, ocupación por zona y detalle de ubicaciones del almacén.
        </p>
      </div>

      <LocationDashboard data={LOCATION_DASHBOARD_DATA} />
    </div>
  );
}
