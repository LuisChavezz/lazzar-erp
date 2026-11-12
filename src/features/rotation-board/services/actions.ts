import { v1_api } from "@/src/api/v1.api";
import type { RotationBoardResponse } from "../interfaces/rotation-board.interface";
import type {
  VariantMaterialNeeds,
  VariantMaterialNeedsParams,
} from "../interfaces/variant-materials.interface";
import { normalizeImportePorMoneda } from "../utils/rotationBoardAmounts";

/**
 * `GET /planeacion/tablero-rotacion/` con los parámetros ya validados por la
 * tabla. `importe_por_moneda` (resumen y filas) se normaliza aquí: una clave
 * ausente o un valor ilegible queda en `null`, igual que sin permiso.
 */
export const getRotationBoardPage = async (
  params: Record<string, string | number>,
): Promise<RotationBoardResponse> => {
  const response = await v1_api.get<RotationBoardResponse>("/planeacion/tablero-rotacion/", {
    params,
  });
  const data = response.data;
  return {
    ...data,
    resumen: {
      ...data.resumen,
      importe_por_moneda: normalizeImportePorMoneda(data.resumen.importe_por_moneda),
    },
    results: data.results.map((row) => ({
      ...row,
      importe_por_moneda: normalizeImportePorMoneda(row.importe_por_moneda),
    })),
  };
};

/**
 * `GET /planeacion/necesidades-materia-prima/?variante=&cantidad=[&sucursal=]`
 * (desglose de un SKU). Con `sucursal`, la existencia de los insumos es la de
 * esa sucursal, igual que en la fila del tablero; sin ella, la del alcance por
 * defecto del usuario (sus sucursales, o toda la empresa para el admin).
 */
export const getVariantMaterialNeeds = async ({
  variante,
  cantidad,
  sucursal,
}: VariantMaterialNeedsParams): Promise<VariantMaterialNeeds> => {
  const response = await v1_api.get<VariantMaterialNeeds>(
    "/planeacion/necesidades-materia-prima/",
    { params: sucursal === null ? { variante, cantidad } : { variante, cantidad, sucursal } },
  );
  return response.data;
};
