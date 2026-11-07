import { StockMovementReportView } from "@/src/features/reports/components/StockMovementReportView";

/**
 * Reporte de movimientos de inventario por periodo. Sin regla propia de permisos: la cubre el prefijo
 * `/system/reports` → `R-CORE-REPORTES` de `routePermissions`.
 */
export default function SystemReportsMovimientosPage() {
  return <StockMovementReportView />;
}
