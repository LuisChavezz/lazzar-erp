import { buildWorkOrderStatusPayload } from "@/src/utils/workOrderStatusEdit";
import type {
  ReflectiveOrderStatus,
  UpdateReflectiveOrderPayload,
} from "../interfaces/reflective-order.interface";

/**
 * Cuerpo del `PATCH` que cambia el estatus de una orden de reflejante, bajo
 * `estatus_reflejante`. La regla de `fecha_fin` vive en
 * `buildWorkOrderStatusPayload`, compartida con corte de manga.
 */
export const buildReflectiveStatusPayload = (
  current: ReflectiveOrderStatus,
  next: ReflectiveOrderStatus,
): UpdateReflectiveOrderPayload =>
  buildWorkOrderStatusPayload("estatus_reflejante", current, next);
