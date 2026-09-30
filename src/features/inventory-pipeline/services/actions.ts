import { v1_api } from "@/src/api/v1.api";
import type {
  InventoryPipelineResponseApi,
  InventoryPipelineResultadoApi,
} from "../interfaces/inventory-pipeline.interface";

/**
 * Reporte de existencias, producción y compras por producto
 * (`GET /inventarios/existencias/reporte-existencias-produccion-compras/`).
 *
 * Se acota a la empresa del workspace con `empresa_id` (mismo parámetro y misma
 * fuente que `getCompanyBranches`). El backend filtra con ella los almacenes de
 * producto terminado y deriva de ESOS almacenes las empresas con que filtra las
 * OP y las OC, así que disponible, en OP y compras quedan en el mismo alcance.
 * Sin ella, un usuario con varias empresas vería la suma de todas.
 *
 * `sucursal`/`almacen` se omiten a propósito: también acotan los almacenes,
 * pero producción y compras solo se filtran por EMPRESA, así que mezclarían
 * alcances (disponible de una sucursal contra OP/OC de toda la empresa). Sin
 * paginación ni orden.
 *
 * Con `{"resultados": []}` (200) cuando el usuario no ve ningún almacén de
 * producto terminado.
 */
export const getInventoryPipeline = async (
  companyId: number,
): Promise<InventoryPipelineResultadoApi[]> => {
  const response = await v1_api.get<InventoryPipelineResponseApi>(
    "/inventarios/existencias/reporte-existencias-produccion-compras/",
    { params: { empresa_id: companyId } },
  );
  return response.data.resultados ?? [];
};
