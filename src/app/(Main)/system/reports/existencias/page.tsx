import { StockReportView } from "@/src/features/reports/components/StockReportView";

/**
 * Reporte de existencias por periodo. Sin regla propia de permisos: la cubre el prefijo
 * `/system/reports` → `R-CORE-REPORTES` de `routePermissions`.
 */
export default function SystemReportsExistenciasPage() {
  return <StockReportView />;
}
