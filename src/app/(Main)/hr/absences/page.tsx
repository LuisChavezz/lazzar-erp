import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import AbsenceList from "@/src/features/absences/components/AbsenceList";

export default function HrAbsencesPage() {
  return (
    <div className="w-full">
      {/* `AbsenceList` lee `?solicitud=` con `useSearchParams`, que pide un
          límite de Suspense por encima (EC-935). */}
      <Suspense fallback={<Loader className="py-20" title="Cargando permisos y ausencias..." />}>
        <AbsenceList />
      </Suspense>
    </div>
  );
}
