import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader } from "@/src/components/Loader";
import { RotationBoardView } from "@/src/features/rotation-board/components/RotationBoardView";

export const metadata: Metadata = {
  title: "Planeación | Producción | ERP",
};

/**
 * Planeación: tablero de rotación de producto terminado (EC-867). La vista lee
 * filtros, orden, página y parámetros de cálculo de la URL con
 * `useSearchParams`, que en Next.js requiere un límite de Suspense.
 */
export default function ManufacturingPlanningPage() {
  return (
    <Suspense fallback={<Loader className="py-20" title="Cargando tablero de rotación..." />}>
      <RotationBoardView />
    </Suspense>
  );
}
