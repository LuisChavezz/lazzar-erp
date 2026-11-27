import { Suspense } from "react";
import { MovementLedgerView } from "@/src/features/reports/components/MovementLedgerView";

/**
 * Auxiliar de movimientos (kardex) de un SKU. Sin regla propia de permisos: la cubre el prefijo
 * `/system/reports` → `R-CORE-REPORTES` de `routePermissions`. `Suspense` porque la vista lee
 * `?q=` (el SKU con el que se abre desde otro reporte).
 */
export default function SystemReportsAuxiliarPage() {
  return (
    <Suspense>
      <MovementLedgerView />
    </Suspense>
  );
}
