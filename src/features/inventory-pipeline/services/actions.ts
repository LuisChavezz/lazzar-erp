import { v1_api } from "@/src/api/v1.api";
import type {
  InventoryPipelineResponseApi,
  InventoryPipelineResultadoApi,
} from "../interfaces/inventory-pipeline.interface";

/**
 * Reporte de existencias, producción y compras por producto
 * (`GET /inventarios/existencias/reporte-existencias-produccion-compras/`).
 *
 * Sin parámetros a propósito: el endpoint acepta `sucursal`/`almacen`/`empresa`,
 * pero producción y compras los ignoran del lado del backend, así que filtrar
 * por ellos mezclaría alcances en los totales. Sin paginación ni orden.
 *
 * Con `{"resultados": []}` (200) cuando el usuario no ve ningún almacén de
 * producto terminado.
 */
export const getInventoryPipeline = async (): Promise<InventoryPipelineResultadoApi[]> => {
  const response = await v1_api.get<InventoryPipelineResponseApi>(
    "/inventarios/existencias/reporte-existencias-produccion-compras/",
  );
  return response.data.resultados ?? [];
};
