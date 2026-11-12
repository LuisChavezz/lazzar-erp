import { v1_api } from "@/src/api/v1.api";
import type { RotationBoardResponse } from "../interfaces/rotation-board.interface";
import type {
  VariantMaterialNeeds,
  VariantMaterialNeedsParams,
} from "../interfaces/variant-materials.interface";

/** `GET /planeacion/tablero-rotacion/` con los parámetros ya validados por la tabla. */
export const getRotationBoardPage = async (
  params: Record<string, string | number>,
): Promise<RotationBoardResponse> => {
  const response = await v1_api.get<RotationBoardResponse>("/planeacion/tablero-rotacion/", {
    params,
  });
  return response.data;
};

/** `GET /planeacion/necesidades-materia-prima/?variante=&cantidad=` (desglose de un SKU). */
export const getVariantMaterialNeeds = async ({
  variante,
  cantidad,
}: VariantMaterialNeedsParams): Promise<VariantMaterialNeeds> => {
  const response = await v1_api.get<VariantMaterialNeeds>(
    "/planeacion/necesidades-materia-prima/",
    { params: { variante, cantidad } },
  );
  return response.data;
};
