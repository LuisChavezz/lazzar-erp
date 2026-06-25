import { v1_api } from "@/src/api/v1.api";
import { Bom, ListaMaterialCreate, BomBulkItem } from "../interfaces/bom.interface";

/**
 * Recupera la lista de materiales (BOM) de una variante de producto desde
 * `GET /produccion/lista-material?producto_variante_id={id}`.
 *
 * @param productoVarianteId Identificador de la variante de producto. Es
 *                           obligatorio: el endpoint filtra la BOM por variante.
 */
export const getBom = async (productoVarianteId: number): Promise<Bom[]> => {
  const response = await v1_api.get<Bom[]>("/produccion/lista-material", {
    params: {
      producto_variante_id: productoVarianteId,
    },
  });
  return response.data;
};

export const createListaMaterial = async (body: ListaMaterialCreate): Promise<Bom> => {
  const response = await v1_api.post<Bom>("/produccion/lista-material/", body);
  return response.data;
};

export const deleteBomDetalle = async (id: number): Promise<void> => {
  await v1_api.delete(`/produccion/bom-detalle/${id}/`);
};

export const getBomBulk = async (
  productoVarianteIds: number[]
): Promise<BomBulkItem[]> => {
  const { data } = await v1_api.get<BomBulkItem[]>(
    '/produccion/lista-material/bulk/',
    {
      params: {
        producto_variante_ids: productoVarianteIds.join(','),
      },
    }
  );
  return data;
};
