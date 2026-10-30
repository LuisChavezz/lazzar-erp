import { buildWorkOrderStatusPayload } from "@/src/utils/workOrderStatusEdit";
import type {
  CorteMangaOrderStatus,
  UpdateCorteMangaOrderPayload,
} from "../interfaces/corte-manga-order.interface";

/**
 * Cuerpo del `PATCH` que cambia el estatus de una orden de corte de manga,
 * bajo `estatus_corte`. La regla de `fecha_fin` vive en
 * `buildWorkOrderStatusPayload`, compartida con reflejante.
 */
export const buildCorteMangaStatusPayload = (
  current: CorteMangaOrderStatus,
  next: CorteMangaOrderStatus,
): UpdateCorteMangaOrderPayload => buildWorkOrderStatusPayload("estatus_corte", current, next);
