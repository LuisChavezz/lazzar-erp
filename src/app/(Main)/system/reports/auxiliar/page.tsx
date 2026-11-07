import { MovementLedgerView } from "@/src/features/reports/components/MovementLedgerView";

/**
 * Auxiliar de movimientos (kardex) de un SKU. Sin regla propia de permisos: la cubre el prefijo
 * `/system/reports` → `R-CORE-REPORTES` de `routePermissions`.
 */
export default function SystemReportsAuxiliarPage() {
  return <MovementLedgerView />;
}
