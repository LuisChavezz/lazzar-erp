import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import VacationList from "@/src/features/vacations/components/VacationList";

export default function HrVacationsPage() {
  return (
    <div className="w-full">
      {/* `VacationList` lee `?solicitud=` con `useSearchParams`, que pide un
          límite de Suspense por encima (EC-935). */}
      <Suspense fallback={<Loader className="py-20" title="Cargando vacaciones..." />}>
        <VacationList />
      </Suspense>
    </div>
  );
}
