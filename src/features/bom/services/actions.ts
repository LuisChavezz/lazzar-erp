import { v1_api } from "@/src/api/v1.api";
import { Bom } from "../interfaces/bom.interface";

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
