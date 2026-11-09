import { MOVEMENT_TYPE_CONFIG } from "@/src/features/stock-movements/constants/movementTypes";
import type { StockMovementReportType } from "../interfaces/stock-movement-report.interface";

/**
 * Tipos del reporte de movimientos por periodo, en el orden del selector, con
 * los estilos del módulo de movimientos (badge con punto de color).
 *
 * El reporte lee `MovimientoInventario.tipo_movimiento`, que nombra la
 * transferencia `TRANSFERENCIA`; `MOVEMENT_TYPE_CONFIG` (auditoría de
 * existencias) la llama `TRASPASO`. Se toman sus colores con la etiqueta del
 * reporte. `Record` del enum completo: un tipo nuevo falla en `typecheck`
 * hasta tener etiqueta.
 */
export const STOCK_MOVEMENT_REPORT_TYPE_CONFIG: Record<
  StockMovementReportType,
  (typeof MOVEMENT_TYPE_CONFIG)[string]
> = {
  ENTRADA: MOVEMENT_TYPE_CONFIG.ENTRADA,
  SALIDA: MOVEMENT_TYPE_CONFIG.SALIDA,
  AJUSTE: MOVEMENT_TYPE_CONFIG.AJUSTE,
  TRANSFERENCIA: { ...MOVEMENT_TYPE_CONFIG.TRASPASO, label: "Transferencia" },
};

/** Etiqueta de un tipo del reporte; el código crudo si el contrato aún no lo conoce. */
export const stockMovementReportTypeLabel = (tipo: string): string =>
  STOCK_MOVEMENT_REPORT_TYPE_CONFIG[tipo as StockMovementReportType]?.label ?? tipo;
