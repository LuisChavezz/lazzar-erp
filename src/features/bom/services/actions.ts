import { v1_api } from "@/src/api/v1.api";
import {
  Bom,
  BomDetalle,
  ListaMaterialCreate,
  BomBulkItem,
} from "../interfaces/bom.interface";

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

/**
 * Reemplaza por completo los renglones de materia prima de una lista de
 * materiales existente vía `PATCH /produccion/lista-material/{bom_id}/`.
 *
 * El backend sustituye todo el arreglo `materia_prima_detalle` por el que se
 * envía, por lo que se debe mandar el estado completo deseado (no un parche
 * incremental).
 *
 * @param bom_id                Identificador de la BOM a actualizar.
 * @param materia_prima_detalle Estado completo de los renglones de materia prima.
 */
export const patchBomMateriaPrima = async (
  bom_id: number,
  materia_prima_detalle: BomDetalle[]
): Promise<void> => {
  await v1_api.patch(`/produccion/lista-material/${bom_id}/`, {
    materia_prima_detalle,
  });
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
