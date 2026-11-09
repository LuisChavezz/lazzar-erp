"use client";

import { useWarehouses } from "@/src/features/warehouses/hooks/useWarehouses";
import type { Warehouse } from "@/src/features/warehouses/interfaces/warehouse.interface";
import type { StockReportExportParams } from "../interfaces/stock-report.interface";
import type { StockMovementReportExportParams } from "../interfaces/stock-movement-report.interface";
import { exportStockMovementReport, exportStockReport } from "../services/actions";
import { stockMovementReportFileName, stockReportFileName } from "../utils/stockReportExport";
import { useReportExport } from "./useReportExport";

/** Código del almacén para el nombre de respaldo (la lista ya la cargó el selector). */
const warehouseCodigo = (warehouses: Warehouse[] | undefined, almacenId: number | undefined) =>
  almacenId === undefined ? undefined : warehouses?.find((w) => w.id_almacen === almacenId)?.codigo;

/**
 * PDF y Excel del reporte de existencias por periodo (EC-819). `params` son los
 * filtros de la pantalla, o `null` mientras falte el almacén o el periodo.
 */
export const useStockReportExport = (params: StockReportExportParams | null) => {
  const { data: warehouses } = useWarehouses();
  return useReportExport(
    {
      report: "stock-report",
      request: exportStockReport,
      fallbackFileName: (p, formato) =>
        stockReportFileName({
          almacenId: p.almacen_id,
          codigo: warehouseCodigo(warehouses, p.almacen_id),
          fechaInicio: p.fecha_inicio,
          fechaFinal: p.fecha_final,
          formato,
        }),
    },
    params,
  );
};

/**
 * PDF y Excel del reporte de movimientos por periodo (EC-819). Sin almacén
 * ("Todos los almacenes") no viaja `almacen_id`, igual que en la consulta de la
 * pantalla, y el nombre lleva `todos`.
 */
export const useStockMovementReportExport = (params: StockMovementReportExportParams | null) => {
  const { data: warehouses } = useWarehouses();
  return useReportExport(
    {
      report: "stock-movement-report",
      request: exportStockMovementReport,
      fallbackFileName: (p, formato) =>
        stockMovementReportFileName({
          tipoMovimiento: p.tipo_movimiento,
          almacenId: p.almacen_id,
          codigo: warehouseCodigo(warehouses, p.almacen_id),
          fechaInicio: p.fecha_inicio,
          fechaFinal: p.fecha_final,
          formato,
        }),
    },
    params,
  );
};
