import { CORTE_MANGA_ORDER_COMPLETED_STATUS } from "../constants/corteMangaOrderStatusTransitions";
import type {
  CorteMangaOrderStatus,
  UpdateCorteMangaOrderPayload,
} from "../interfaces/corte-manga-order.interface";

/**
 * Cuerpo del `PATCH` que cambia el estatus de una orden de corte de manga.
 *
 * `fecha_fin` es de solo lectura en la UI y la regla vive aquí:
 *  - Al ENTRAR a `5` (Completado) NO se envía: el backend la sella con la hora
 *    actual solo si la clave falta del cuerpo y la orden no tenía una. Mandarla
 *    —aunque fuera `null`— impediría el sello.
 *  - Al SALIR de `5` se envía `fecha_fin: null` en el mismo `PATCH`: el backend
 *    conserva la fecha anterior, y una orden reabierta no debe aparentar que ya
 *    terminó.
 *  - Entre dos estatus que no son `5`, no se toca.
 *
 * Función PURA para poder probar cada caso sin React (ver `tests/unit`). Misma
 * regla que `buildReflectiveStatusPayload`.
 */
export const buildCorteMangaStatusPayload = (
  current: CorteMangaOrderStatus,
  next: CorteMangaOrderStatus,
): UpdateCorteMangaOrderPayload =>
  current === CORTE_MANGA_ORDER_COMPLETED_STATUS && next !== CORTE_MANGA_ORDER_COMPLETED_STATUS
    ? { estatus_corte: next, fecha_fin: null }
    : { estatus_corte: next };
