import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { AttendanceView } from "@/src/features/attendance/components/AttendanceView";

/**
 * Asistencia de RH. Sin regla propia de permisos: la cubre el catch-all
 * `/hr` → `R-RH` de `routePermissions`.
 */
export default function HrAttendancePage() {
  return (
    <div className="w-full">
      {/* `AttendanceView` lee pestaña, día y periodo desde la URL con
          `useSearchParams`, que en Next.js requiere un límite de Suspense en el
          árbol superior. */}
      <Suspense fallback={<Loader className="py-20" title="Cargando asistencia..." />}>
        <AttendanceView />
      </Suspense>
    </div>
  );
}
